import { AIProvider } from '@/lib/server/ai/providers/AIProvider';
import { createStoryPrompt } from '@/lib/server/storyPrompt';

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    const stripped = text.replace(/```json|```/g, '').trim();
    return JSON.parse(stripped);
  }
}

export class GeminiProvider extends AIProvider {
  constructor({ apiKey, model }) {
    super();
    this.apiKey = apiKey;
    this.model = model;
  }

  async generateStory(payload) {
    const prompt = createStoryPrompt(payload);
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 1200,
            responseMimeType: 'application/json',
          },
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Gemini request failed: ${response.status}`);
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error('Gemini returned empty response');
    }
    return safeJsonParse(text);
  }
}
