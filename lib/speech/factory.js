import { SPEECH_ENGINES } from '@/lib/config';
import { MediaRecorderSpeechService } from '@/lib/speech/MediaRecorderSpeechService';
import { BrowserSpeechRecognition } from '@/lib/speech/BrowserSpeechRecognition';
import { WhisperSpeechService } from '@/lib/speech/WhisperSpeechService';
import { NativeIosSpeechService } from '@/lib/speech/NativeIosSpeechService';
import { CloudSpeechService } from '@/lib/speech/CloudSpeechService';

export function createSpeechService(engine) {
  switch (engine) {
    case SPEECH_ENGINES.BROWSER_LIVE:
      return new BrowserSpeechRecognition();
    case SPEECH_ENGINES.WHISPER:
      return new WhisperSpeechService();
    case SPEECH_ENGINES.NATIVE_IOS:
      return new NativeIosSpeechService();
    case SPEECH_ENGINES.CLOUD:
      return new CloudSpeechService();
    case SPEECH_ENGINES.RECORDING_FIRST:
    default:
      return new MediaRecorderSpeechService();
  }
}
