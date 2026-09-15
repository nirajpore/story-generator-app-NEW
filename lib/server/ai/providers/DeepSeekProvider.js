import { AIProvider } from './AIProvider';
import { createStoryPrompt } from '../../storyPrompt';

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    const stripped = text.replace(/```json|```/g, '').trim();
    try {
      return JSON.parse(stripped);
    } catch {
      // If still fails, try to extract JSON from any text
      const jsonMatch = stripped.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('Failed to parse JSON response');
    }
  }
}

export class DeepSeekProvider extends AIProvider {
  constructor({ apiKey, model }) {
    super();
    this.apiKey = apiKey;
    this.model = model || 'deepseek-chat';
  }

  async generateStory(payload) {
    const prompt = createStoryPrompt(payload);
    
    // OpenRouter API endpoint - using OpenAI-compatible format
    // OpenRouter supports DeepSeek models through their API
    const requestBody = {
      model: this.model,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.8,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    };

    const response = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'Story Generator App',
        },
        body: JSON.stringify(requestBody),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API request failed (${response.status}). Check your OpenRouter API key and credits: ${errorText}`);
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content;
    if (!text) {
      throw new Error('OpenRouter returned empty response');
    }
    
    return safeJsonParse(text);
  }
}