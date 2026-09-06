import { SpeechRecognitionService } from '@/lib/speech/SpeechRecognitionService';

export class CloudSpeechService extends SpeechRecognitionService {
  async startRecording() {
    throw new Error('Cloud speech integration is not configured yet.');
  }

  async stopRecording() {
    return { transcript: '', confidence: 0, processingTimeMs: 0 };
  }
}
