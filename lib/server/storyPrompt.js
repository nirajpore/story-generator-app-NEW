export function createStoryPrompt({ theme, childProfile, readingSessions, difficultWords, targetPageCount, previousStories, themeContext }) {
  const recentSessions = (readingSessions || []).slice(0, 5).map((item) => ({
    score: item.score,
    accuracy: item.accuracy,
    wpm: item.wordsPerMinute,
  }));
  const recentTitles = (previousStories || []).slice(0, 3).map((item) => item.title).join(', ') || 'None yet';
  const difficultWordList = Object.values(difficultWords || {})
    .sort((a, b) => (b.missed || 0) - (a.missed || 0))
    .slice(0, 6)
    .map((w) => w.word)
    .join(', ') || 'none';

  return `
You are writing an ORIGINAL children's story for one 6-year-old reader.
Never copy existing books, episodes, or copyrighted text.

Child profile:
- Current internal level: ${childProfile.currentLevel}
- Internal progress in current level: ${childProfile.levelProgress}
- Next milestone: ${childProfile.nextMilestone}
- Recent performance: ${JSON.stringify(recentSessions)}
- Difficult words to naturally reinforce: ${difficultWordList}
- Recent stories: ${recentTitles}
- Theme context: ${JSON.stringify(themeContext)}

Theme: ${theme}
Target pages: ${targetPageCount}

Writing requirements:
- Create a rich, engaging story with descriptive language
- Each page should be substantial (aim for 80-140 words per page)
- Include character development, descriptive settings, and meaningful dialogue
- Make sure each page advances the plot and includes interesting details
- Encourage expressive reading with meaningful punctuation and dialogue
- Include light humor, surprise, and a satisfying ending
- Add a soft cliffhanger line for tomorrow
- 5-8 pages by default, longer for advanced readers
- Keep language suitable for a child near the end of blue moving toward grey

Return ONLY valid JSON with this exact shape:
{
  "title": "string",
  "theme": "string",
  "difficulty": "blue|grey|etc",
  "pages": [
    { "pageNumber": 1, "text": "string", "illustrationPrompt": "string" }
  ],
  "wordCount": number,
  "metadata": {
    "cliffhanger": "string"
  }
}
`.trim();
}
