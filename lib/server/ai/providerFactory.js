import { MockAIProvider } from './providers/MockAIProvider';
import { GeminiProvider } from './providers/GeminiProvider';
import { DeepSeekProvider } from './providers/DeepSeekProvider';

const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
const DEFAULT_DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

export function createAIProvider() {
  // Check for DeepSeek API key first (OpenRouter key works with DeepSeek model)
  if (process.env.DEEPSEEK_API_KEY) {
    console.log('AI Provider: Using DeepSeekProvider via OpenRouter');
    return new DeepSeekProvider({
      apiKey: process.env.DEEPSEEK_API_KEY,
      model: DEFAULT_DEEPSEEK_MODEL,
    });
  }
  
  // Fall back to Gemini if DeepSeek not configured
  if (process.env.GEMINI_API_KEY) {
    console.log('AI Provider: Using GeminiProvider');
    return new GeminiProvider({
      apiKey: process.env.GEMINI_API_KEY,
      model: DEFAULT_GEMINI_MODEL,
    });
  }

  // Fall back to mock if no API keys configured
  console.log('AI Provider: Using MockAIProvider (no API keys configured)');
  return new MockAIProvider();
}
