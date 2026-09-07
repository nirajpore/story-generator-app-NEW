import { SpeechRecognitionService } from '@/lib/speech/SpeechRecognitionService';

export class BrowserSpeechRecognition extends SpeechRecognitionService {
  constructor() {
    super();
    this.transcript = '';
    this.recognition = null;
  }

  async startRecording() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) throw new Error('Browser SpeechRecognition is unavailable on this device');
    this.transcript = '';
    this.recognition = new SR();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.onresult = (event) => {
      let result = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        result += `${event.results[i][0].transcript} `;
      }
      this.transcript = `${this.transcript} ${result}`.trim();
    };
    this.recognition.start();
  }

  async stopRecording() {
    if (this.recognition) this.recognition.stop();
    return { transcript: this.transcript.trim(), confidence: 0.55, processingTimeMs: 0 };
  }

  async transcribe() {
    return { transcript: this.transcript.trim(), confidence: 0.55, processingTimeMs: 0 };
  }
}
