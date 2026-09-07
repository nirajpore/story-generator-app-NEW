import { AIProvider } from './AIProvider';

const DEFAULT_MODEL = 'gemini-1.5-flash';

export class GeminiProvider extends AIProvider {
  constructor({ apiKey, model = DEFAULT_MODEL }) {
    super({ provider: 'Gemini', model });

    if (!apiKey) {
      throw new Error('Missing GEMINI_API_KEY');
    }

    this.apiKey = apiKey;
  }

  async generateStory({ prompt, signal }) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 500,
          },
        }),
        signal,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini request failed: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    const story = result?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!story) {
      throw new Error('Gemini returned an empty story');
    }

    return {
      story,
      provider: this.provider,
      model: this.model,
      rawResponse: result,
    };
  }
}
