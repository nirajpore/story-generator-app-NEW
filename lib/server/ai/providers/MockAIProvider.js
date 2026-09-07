import { AIProvider } from '@/lib/server/ai/providers/AIProvider';

function toPages(text, pageCount) {
  const parts = text.split('. ').filter(Boolean);
  const pages = [];
  const chunkSize = Math.max(1, Math.ceil(parts.length / pageCount));
  for (let i = 0; i < pageCount; i += 1) {
    const chunk = parts.slice(i * chunkSize, (i + 1) * chunkSize).join('. ').trim();
    if (!chunk) continue;
    pages.push({
      pageNumber: pages.length + 1,
      text: chunk.endsWith('.') ? chunk : `${chunk}.`,
      illustrationPrompt: 'Friendly children book illustration, warm colors.',
    });
  }
  return pages;
}

export class MockAIProvider extends AIProvider {
  async generateStory(payload) {
    const { theme, targetPageCount, childProfile } = payload;
    const pages = toPages(
      `${theme} woke up to a sparkly surprise near the old tree. ` +
      `A tiny map pointed to a hidden path full of giggles and clues. ` +
      `Along the way, ${theme} met a new friend who loved saying the word bright. ` +
      `They crossed a wobbly bridge, solved a funny riddle, and found a glowing cave. ` +
      `Inside was a note that said, "The bravest readers find the next adventure tomorrow!"`,
      Math.max(3, Math.min(8, targetPageCount || 4)),
    );
    const wordCount = pages.join ? 0 : pages.reduce((sum, p) => sum + p.text.split(/\s+/).filter(Boolean).length, 0);
    return {
      title: `${theme} and the Hidden Clue`,
      theme,
      difficulty: childProfile.currentLevel,
      pages,
      wordCount: wordCount || pages.reduce((sum, p) => sum + p.text.split(/\s+/).filter(Boolean).length, 0),
      metadata: {
        provider: 'mock',
        cliffhanger: '🌟 What do you think is inside the glowing cave?',
      },
    };
  }
}
