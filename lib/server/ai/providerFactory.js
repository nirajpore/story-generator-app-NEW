import { MockAIProvider } from '@/lib/server/ai/providers/MockAIProvider';
import { GeminiProvider } from '@/lib/server/ai/providers/GeminiProvider';

const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

export function createAIProvider() {
  if (process.env.GEMINI_API_KEY) {
    return new GeminiProvider({
      apiKey: process.env.GEMINI_API_KEY,
      model: DEFAULT_GEMINI_MODEL,
    });
  }

  return new MockAIProvider();
}
