import { SpeechRecognitionService } from '@/lib/speech/SpeechRecognitionService';

export class WhisperSpeechService extends SpeechRecognitionService {
  async startRecording() {
    throw new Error('Whisper engine is a future option and is not wired in this MVP.');
  }

  async stopRecording() {
    return { transcript: '', confidence: 0, processingTimeMs: 0 };
  }
}
