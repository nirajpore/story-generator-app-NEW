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
- Each page should be concise and easy to read (aim for 45-80 words per page)
- Break the story into more, shorter pages for young readers
- Include character development, descriptive settings, and meaningful dialogue
- Make sure each page advances the plot and includes interesting details
- Encourage expressive reading with meaningful punctuation and dialogue
- Include light humor, surprise, and a satisfying ending
- Add a soft cliffhanger line for tomorrow
- 5-7 pages by default, more for advanced readers
- Keep language suitable for a child at blue level moving toward grey (RWI Phonics Level)
  - For blue level: Use varied sentence structures, some complex vocabulary
  - For grey level: Include more descriptive language, character development
  - Include 3-5 comprehension questions (see below)

Return ONLY valid JSON with this exact shape:
{
  "title": "string",
  "theme": "string",
  "difficulty": "blue|grey|etc",
  "pages": [
    { "pageNumber": 1, "text": "string", "illustrationPrompt": "string" }
  ],
  "wordCount": number,
  "comprehensionQuestions": [
    {
      "type": "literal|inferential|vocabulary",
      "question": "Clear, age-appropriate question",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Brief explanation referencing story"
    }
  ],
  "metadata": {
    "cliffhanger": "string"
  }
}

COMPREHENSION QUESTION REQUIREMENTS:
1. Include 3-5 multiple choice questions
2. Mix of question types:
   - Literal (facts directly from story)
   - Inferential (why/how/what if)
   - Vocabulary (word meaning in context)
3. Each question must have 4 plausible answer options
4. Mark correct answer (0-3 index)
5. Provide brief explanation referencing story text
6. Questions should be appropriate for blue/grey reading level
`.trim();
}
