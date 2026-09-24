import { AIProvider } from './AIProvider';
import { createStoryPrompt } from '../../storyPrompt';

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    // Try removing markdown code blocks
    const stripped = text.replace(/```json|```/g, '').trim();
    try {
      return JSON.parse(stripped);
    } catch {
      // Try to extract JSON from any text (handle truncated JSON)
      const jsonMatch = stripped.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const extracted = jsonMatch[0];
          // Try to fix common truncation issues
          const fixed = extracted.replace(/,(\s*)$/, '$1') // Remove trailing comma
                                .replace(/("[^"]*)?$/, '') // Remove incomplete string
                                .replace(/,\s*}/, '}') // Remove trailing comma before }
                                .replace(/,\s*]/, ']'); // Remove trailing comma before ]
          
          // Try to parse the fixed version
          return JSON.parse(fixed);
        } catch (e) {
          console.error('Failed to parse extracted JSON:', e.message);
          console.error('Extracted text (first 500 chars):', extracted.substring(0, 500));
          throw new Error('Failed to parse JSON response from AI. The story might be truncated.');
        }
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
    console.log('DeepSeek prompt sent:', prompt.substring(0, 500) + '...');
    
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
      max_tokens: 4096, // Increased to OpenRouter's typical max for DeepSeek models
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
      console.error('OpenRouter returned empty response:', data);
      throw new Error('OpenRouter returned empty response');
    }
    
    try {
      const parsed = safeJsonParse(text);
      console.log('Successfully parsed story with', parsed.pages?.length || 0, 'pages and', parsed.wordCount || 0, 'words');
      console.log('Comprehension questions count:', parsed.comprehensionQuestions?.length || 0);
      if (parsed.comprehensionQuestions) {
        console.log('Question types:', parsed.comprehensionQuestions.map(q => q.type));
      }
      return parsed;
    } catch (error) {
      console.error('JSON parsing failed:', error.message);
      console.error('Response text (first 1000 chars):', text.substring(0, 1000));
      
      // Try to extract any JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const extracted = jsonMatch[0];
          console.log('Trying to parse extracted JSON (length:', extracted.length, 'chars)');
          const fixed = extracted.replace(/,(\s*)$/, '$1') // Remove trailing comma
                                .replace(/("[^"]*)?$/, '') // Remove incomplete string
                                .replace(/,\s*}/, '}') // Remove trailing comma before }
                                .replace(/,\s*]/, ']'); // Remove trailing comma before ]
          
          const parsed = JSON.parse(fixed);
          console.log('Successfully parsed extracted story with', parsed.pages?.length || 0, 'pages');
          return parsed;
        } catch (e) {
          console.error('Extracted JSON also failed:', e.message);
        }
      }
      
      throw new Error('Failed to parse JSON response from AI. The story might be truncated: ' + error.message);
    }
  }
}