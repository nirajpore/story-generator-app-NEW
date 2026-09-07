import { GeminiProvider } from '@/lib/ai/GeminiProvider';

export async function POST(request) {
  try {
    const { characterName, setting, rwLevel = 'blue' } = await request.json();

    if (!characterName || characterName.trim().length === 0) {
      return Response.json({ error: 'Character name is required' }, { status: 400 });
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return Response.json(
        { error: 'GEMINI_API_KEY is not configured; AI story generation is unavailable.' },
        { status: 500 }
      );
    }

    const prompt = createRWIPrompt(characterName, setting, rwLevel);
    const aiProvider = new GeminiProvider({ apiKey: geminiApiKey, model: 'gemini-1.5-flash' });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const result = await aiProvider.generateStory({ prompt, signal: controller.signal });

      console.log(
        `[AI GENERATION] provider=${result.provider} model=${result.model} level=${rwLevel} character="${characterName}"`
      );

      return Response.json({
        story: result.story,
        rwLevel,
        aiGeneration: {
          provider: result.provider,
          model: result.model,
          timestamp: new Date().toISOString(),
        },
      });
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    console.error('[AI GENERATION ERROR]', error);

    return Response.json(
      { error: error?.message || 'Failed to generate story with Gemini' },
      { status: 502 }
    );
  }
}

function createRWIPrompt(characterName, setting, rwLevel) {
  const levelGuides = {
    purple: 'Use ONLY simple CVC words (cat, dog, sit, run). Very short sentences. No complex phonemes.',
    pink: 'Use simple CVC words and basic high-frequency words. Short, simple sentences.',
    orange: 'Include some digraphs (sh, ch, th). Slightly longer sentences.',
    yellow: 'Consolidate phase 3-4 phonemes. Mix of simple and slightly more complex words.',
    blue: 'Include phase 4-5 phonemes. Longer sentences with more variety. Good for year 1 readers.',
    grey: 'Use phase 5 phonemes. More complex sentences and varied vocabulary.',
  };

  return `Write a short story (150-250 words) for a 5-6 year old child learning to read.

Main character: ${characterName}
${setting ? `Setting: ${setting}` : 'Setting: A happy, safe place'}
Reading level: RWI ${rwLevel.charAt(0).toUpperCase() + rwLevel.slice(1)}

Instructions:
${levelGuides[rwLevel] || levelGuides.blue}
- Make it fun, engaging, and appropriate for young children
- Include a positive, simple message
- Use clear, easy-to-read language
- Short paragraphs
- Include simple actions and emotions the child can understand

Return only the final story text.`;
}
