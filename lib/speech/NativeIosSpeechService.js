import { SpeechRecognitionService } from '@/lib/speech/SpeechRecognitionService';

export class NativeIosSpeechService extends SpeechRecognitionService {
  async startRecording() {
    throw new Error('Native iOS speech requires an app wrapper and is not available in Safari web context.');
  }

  async stopRecording() {
    return { transcript: '', confidence: 0, processingTimeMs: 0 };
  }
}
