export const AI_CONFIG = {
  defaultProvider: 'gemini',
  model: process.env.NEXT_PUBLIC_DEFAULT_AI_MODEL || 'gemini-1.5-flash',
};

export const SPEECH_ENGINES = {
  RECORDING_FIRST: 'recording-first',
  BROWSER_LIVE: 'browser-live',
  WHISPER: 'whisper',
  NATIVE_IOS: 'native-ios',
  CLOUD: 'cloud',
};
