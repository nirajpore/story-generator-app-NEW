import { createAIProvider } from '@/lib/server/ai/providerFactory';
import { ThemeResearchService } from '@/lib/server/themeResearchService';

function validateStoryPayload(payload) {
  return payload && typeof payload.theme === 'string' && payload.theme.trim().length > 0;
}

export async function POST(request) {
  try {
    const payload = await request.json();
    if (!validateStoryPayload(payload)) {
      return Response.json({ error: 'theme is required' }, { status: 400 });
    }

    const themeResearchService = new ThemeResearchService();
    const themeContext = await themeResearchService.research(payload.theme);
    const provider = createAIProvider();

    const story = await provider.generateStory({
      ...payload,
      themeContext,
    });

    return Response.json(story, { status: 200 });
  } catch (error) {
    console.error('Story generation failed:', error);
    return Response.json({ error: 'Failed to generate story' }, { status: 500 });
  }
}
