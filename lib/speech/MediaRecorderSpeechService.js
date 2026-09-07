import { SpeechRecognitionService } from '@/lib/speech/SpeechRecognitionService';
import { BrowserSpeechRecognition } from '@/lib/speech/BrowserSpeechRecognition';

export class MediaRecorderSpeechService extends SpeechRecognitionService {
  constructor() {
    super();
    this.mediaRecorder = null;
    this.stream = null;
    this.chunks = [];
    this.startedAt = null;
    this.browserFallback = new BrowserSpeechRecognition();
  }

  async startRecording() {
    this.chunks = [];
    this.startedAt = performance.now();

    if (!navigator?.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      await this.browserFallback.startRecording();
      return;
    }

    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.mediaRecorder = new MediaRecorder(this.stream);
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data?.size > 0) this.chunks.push(event.data);
    };
    this.mediaRecorder.start();
    try {
      await this.browserFallback.startRecording();
    } catch (_error) {
      // Optional baseline live transcript
    }
  }

  async stopRecording() {
    const startedAt = this.startedAt || performance.now();
    const stopFallback = await this.browserFallback.stopRecording().catch(() => ({
      transcript: '',
      confidence: 0.45,
      processingTimeMs: 0,
    }));

    if (!this.mediaRecorder) {
      return stopFallback;
    }

    await new Promise((resolve) => {
      this.mediaRecorder.onstop = resolve;
      this.mediaRecorder.stop();
    });

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
    }

    const audioBlob = new Blob(this.chunks, { type: 'audio/webm' });
    const elapsed = Math.round(performance.now() - startedAt);

    return {
      transcript: stopFallback.transcript,
      confidence: stopFallback.confidence,
      processingTimeMs: elapsed,
      audioBlob,
    };
  }

  async transcribe() {
    return { transcript: '', confidence: 0.4, processingTimeMs: 0 };
  }
}
