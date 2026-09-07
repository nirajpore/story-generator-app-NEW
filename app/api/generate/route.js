import { computeStoryTargets, splitStoryIntoPages, validateStoryLocally, countWords } from '@/lib/story/pipeline';

const GEMINI_MODEL = 'gemini-2.5-flash';
const MAX_STORY_ATTEMPTS = 3;
const MAX_OUTLINE_ATTEMPTS = 2;

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function extractText(responseJson) {
  return responseJson?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('\n').trim() || '';
}

function cleanJsonBlock(text = '') {
  return text
    .replace(/^```json/i, '')
    .replace(/^```/i, '')
    .replace(/```$/i, '')
    .trim();
}

async function callGemini({ apiKey, prompt, maxOutputTokens = 4096, enableSearch = false, responseMimeType }) {
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.45,
      maxOutputTokens,
      ...(responseMimeType ? { responseMimeType } : {}),
    },
  };

  if (enableSearch) {
    payload.tools = [{ google_search: {} }];
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Gemini request failed (${response.status}): ${body}`);
  }

  return response.json();
}

async function researchTheme({ apiKey, theme, setting }) {
  const prompt = `Research the following children's character/show/theme:
${theme}
${setting ? `Preferred setting context: ${setting}` : ''}

Find reliable publicly available information that would help create an original children's story.
Return strict JSON with fields:
{
  "theme": "...",
  "identity": "...",
  "personality": ["..."],
  "settingWorld": "...",
  "mainCharacters": ["..."],
  "relationships": ["..."],
  "importantCharacteristics": ["..."],
  "familiarLocationsOrObjects": ["..."],
  "safeAgeAppropriateElements": ["..."],
  "copyrightGuardrails": ["..."],
  "researchSummary": "..."
}

Rules:
- Include only public factual context and broad traits.
- Do NOT reproduce copyrighted stories, episodes, dialogue, or plotlines.
- We are creating an ORIGINAL story inspired by this character/world.
- Do not add markdown. JSON only.`;

  const raw = await callGemini({
    apiKey,
    prompt,
    enableSearch: true,
    maxOutputTokens: 1800,
  });
  const text = extractText(raw);
  let profile = null;
  try {
    profile = JSON.parse(cleanJsonBlock(text));
  } catch {
    profile = {
      theme,
      identity: theme,
      personality: [],
      settingWorld: setting || 'A child-friendly world',
      mainCharacters: [theme],
      relationships: [],
      importantCharacteristics: [],
      familiarLocationsOrObjects: [],
      safeAgeAppropriateElements: ['friendship', 'helping others'],
      copyrightGuardrails: ['Create original plot and dialogue'],
      researchSummary: text.slice(0, 700),
    };
  }

  const groundingChunks = raw?.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const sources = groundingChunks
    .map((chunk) => chunk?.web)
    .filter(Boolean)
    .map((web) => ({ title: web.title || web.uri, url: web.uri }))
    .filter((src) => src.url);

  return {
    completed: sources.length > 0,
    status: sources.length > 0 ? 'completed' : 'no_sources',
    profile,
    sources,
    rawModel: GEMINI_MODEL,
  };
}

async function generateOutline({ apiKey, theme, setting, rwLevel, targets, researchProfile }) {
  const prompt = `Create a coherent children's story outline inspired by this theme research.

Theme: ${theme}
RWI level: ${rwLevel}
Target words: ${targets.targetWords}
Minimum words: ${targets.minimumWords}
${setting ? `Requested setting: ${setting}` : ''}

Research profile JSON:
${JSON.stringify(researchProfile)}

Return strict JSON:
{
  "title": "...",
  "setting": "...",
  "characters": ["..."],
  "mainProblem": "...",
  "beginning": "...",
  "middle": "...",
  "climax": "...",
  "resolution": "...",
  "ending": "...",
  "narrativeChecks": {
    "coherentSequence": true,
    "characterConsistency": true,
    "settingConsistency": true,
    "timelineConsistency": true
  }
}

Rules:
- Original story only.
- Include beginning, middle, climax, resolution, ending.
- Do not return markdown.
- JSON only.`;

  const raw = await callGemini({
    apiKey,
    prompt,
    maxOutputTokens: 1800,
  });

  const text = extractText(raw);
  const parsed = JSON.parse(cleanJsonBlock(text));
  return parsed;
}

function validateOutlineLocally(outline) {
  const requiredTextFields = ['title', 'setting', 'mainProblem', 'beginning', 'middle', 'climax', 'resolution', 'ending'];
  const missing = requiredTextFields.filter((field) => !outline?.[field] || String(outline[field]).trim().length < 12);
  const hasCharacters = Array.isArray(outline?.characters) && outline.characters.length >= 1;
  const checks = outline?.narrativeChecks || {};
  const checksPass = checks.coherentSequence && checks.characterConsistency && checks.settingConsistency && checks.timelineConsistency;
  return {
    valid: missing.length === 0 && hasCharacters && checksPass,
    issues: [
      ...missing.map((field) => `Outline missing strong ${field}`),
      ...(hasCharacters ? [] : ['Outline missing characters list']),
      ...(checksPass ? [] : ['Outline narrative checks failed']),
    ],
  };
}

async function generateStory({ apiKey, theme, rwLevel, targets, outline, researchProfile }) {
  const prompt = `Write an ORIGINAL, coherent children's story based on the outline below.

Theme: ${theme}
RWI level: ${rwLevel}
Word target range: ${targets.minimumWords}-${Math.max(targets.minimumWords + 120, targets.targetWords + 90)}

Research profile:
${JSON.stringify(researchProfile)}

Outline:
${JSON.stringify(outline)}

Rules:
- Keep character names, setting, and timeline consistent.
- Include clear beginning, middle, climax, resolution, and satisfying ending.
- Use age-appropriate language.
- No copied plot/dialogue from existing copyrighted works.
- Produce one complete story as paragraphs with natural flow.
- Do not output JSON or markdown; story text only.`;

  const raw = await callGemini({
    apiKey,
    prompt,
    maxOutputTokens: 6000,
  });
  return extractText(raw);
}

async function validateStoryWithGemini({ apiKey, storyText, theme, rwLevel, minimumWords }) {
  const prompt = `Evaluate this children's story for quality and reading suitability.

Theme: ${theme}
RWI level: ${rwLevel}
Minimum words required: ${minimumWords}
Actual words: ${countWords(storyText)}

Story:
${storyText}

Return strict JSON exactly:
{
  "coherent": true,
  "ageAppropriate": true,
  "hasBeginningMiddleEnd": true,
  "characterConsistency": true,
  "difficultyAppropriate": true,
  "sufficientLength": true,
  "qualityScore": 0,
  "issues": []
}

Quality score must be 0-10.
JSON only.`;

  const raw = await callGemini({
    apiKey,
    prompt,
    maxOutputTokens: 1500,
  });
  const text = extractText(raw);
  return JSON.parse(cleanJsonBlock(text));
}

function fallbackStory(theme, setting, targets) {
  const safeSetting = setting || 'the sunlit valley near Pride Rock';
  const chunks = [
    `One bright morning, ${theme} woke early in ${safeSetting}. The air smelled of warm grass, and tiny birds hopped between the stones as the day began.`,
    `${theme} promised to help younger friends prepare for the Big Moonlight Gathering, where everyone would share stories and songs. But when they reached the meeting hill, the drum used to start the celebration was missing.`,
    `Without the drum, no one would know when to gather, and the younger cubs started to worry. ${theme} took a deep breath, listened carefully, and noticed a faint rhythm echoing from the river path.`,
    `Along the way, the group faced small challenges. A narrow log bridge trembled above the stream, and a gust of wind scattered their map leaves. Each time, ${theme} paused, encouraged everyone, and helped them try again.`,
    `At last they found the drum beside a fig tree where playful monkeys had rolled it while dancing. The monkeys were embarrassed and quickly apologized, offering fruit and help carrying the drum back.`,
    `When they returned, the gathering began with laughter, music, and relief. ${theme} thanked every helper and reminded everyone that brave hearts grow stronger when friends solve problems together.`,
    `As moonlight stretched across the rocks, the youngest cub asked for one more story. ${theme} smiled, tapped the drum softly, and began an entirely new adventure for another night.`,
  ];

  let story = chunks.join('\n\n');
  while (countWords(story) < targets.minimumWords) {
    story += `\n\nThey remembered the journey details, from the rippling water to the rustling trees, and each friend shared one lesson they had learned about patience, kindness, and courage.`;
  }
  return story;
}

export async function POST(request) {
  try {
    const {
      characterName,
      setting,
      rwLevel = 'blue',
      previousStoryWordCount,
      recentPerformance,
      engagement,
    } = await request.json();

    if (!characterName || !characterName.trim()) {
      return jsonResponse({ error: 'Character name is required' }, 400);
    }

    const theme = characterName.trim();
    const targets = computeStoryTargets({
      rwLevel,
      previousStoryWordCount,
      recentPerformance,
      engagement,
    });

    const geminiToken = process.env.GEMINI_API_KEY;
    const debug = {
      theme,
      rwLevel,
      model: GEMINI_MODEL,
      targetWords: targets.targetWords,
      minimumWords: targets.minimumWords,
    targetPageCount: `${targets.targetPageCountMin}-${targets.targetPageCountMax}`,
    storyAttempts: [],
    outlineAttempts: [],
    };

    if (!geminiToken) {
      const storyText = fallbackStory(theme, setting, targets);
      const pages = splitStoryIntoPages(storyText, {
        minWords: targets.preferredPageWordMin,
        maxWords: targets.preferredPageWordMax,
      });
      const quality = validateStoryLocally({
        storyText,
        theme,
        minimumWords: targets.minimumWords,
        pageWordMin: targets.preferredPageWordMin,
        pageWordMax: targets.preferredPageWordMax,
        pageCountMin: targets.targetPageCountMin,
        pageCountMax: targets.targetPageCountMax,
        pages,
      });

      return jsonResponse({
        story: storyText,
        pages,
        rwLevel,
        wordCount: quality.wordCount,
        research: {
          completed: false,
          summary: 'No Gemini API key configured. Used local fallback story generation.',
          sources: [],
        },
        qualityValidation: quality,
        debug: {
          ...debug,
          pipelineStatus: 'fallback_no_api_key',
          storyValidationPassed: quality.coherent && quality.sufficientLength && quality.pageCountValid,
          reason: 'fallback_no_api_key',
        },
      });
    }

    const researchResult = await researchTheme({
      apiKey: geminiToken,
      theme,
      setting,
    });

    debug.researchCompleted = researchResult.completed;
    debug.researchSourceCount = researchResult.sources.length;

    let outline = null;
    for (let attempt = 1; attempt <= MAX_OUTLINE_ATTEMPTS; attempt++) {
      const candidate = await generateOutline({
        apiKey: geminiToken,
        theme,
        setting,
        rwLevel,
        targets,
        researchProfile: researchResult.profile,
      });
      const outlineValidation = validateOutlineLocally(candidate);
      debug.outlineAttempts.push({
        attempt,
        valid: outlineValidation.valid,
        issues: outlineValidation.issues,
      });
      if (outlineValidation.valid || attempt === MAX_OUTLINE_ATTEMPTS) {
        outline = candidate;
        break;
      }
    }
    debug.outline = outline;

    let selectedStory = '';
    let selectedQuality = null;
    let selectedPages = [];

    for (let attempt = 1; attempt <= MAX_STORY_ATTEMPTS; attempt++) {
      const storyText = await generateStory({
        apiKey: geminiToken,
        theme,
        rwLevel,
        targets,
        outline,
        researchProfile: researchResult.profile,
      });

      const pages = splitStoryIntoPages(storyText, {
        minWords: targets.preferredPageWordMin,
        maxWords: targets.preferredPageWordMax,
      });
      const localValidation = validateStoryLocally({
        storyText,
        theme,
        minimumWords: targets.minimumWords,
        pageWordMin: targets.preferredPageWordMin,
        pageWordMax: targets.preferredPageWordMax,
        pageCountMin: targets.targetPageCountMin,
        pageCountMax: targets.targetPageCountMax,
        pages,
      });

      let aiValidation = null;
      try {
        aiValidation = await validateStoryWithGemini({
          apiKey: geminiToken,
          storyText,
          theme,
          rwLevel,
          minimumWords: targets.minimumWords,
        });
      } catch {
        aiValidation = null;
      }

      const mergedQuality = {
        ...localValidation,
        ...(aiValidation || {}),
        qualityScore: Number(
          (
            (localValidation.qualityScore * 0.6) +
            ((aiValidation?.qualityScore || localValidation.qualityScore) * 0.4)
          ).toFixed(2)
        ),
        issues: [...new Set([...(localValidation.issues || []), ...((aiValidation?.issues) || [])])],
      };

      debug.storyAttempts.push({
        attempt,
        wordCount: localValidation.wordCount,
        qualityScore: mergedQuality.qualityScore,
        issues: mergedQuality.issues,
      });

      const pass = mergedQuality.coherent &&
        mergedQuality.ageAppropriate &&
        mergedQuality.hasBeginningMiddleEnd &&
        mergedQuality.characterConsistency &&
        mergedQuality.difficultyAppropriate &&
        mergedQuality.pageCountValid &&
        mergedQuality.sufficientLength &&
        mergedQuality.qualityScore >= 7;

      if (pass || attempt === MAX_STORY_ATTEMPTS) {
        selectedStory = storyText;
        selectedQuality = mergedQuality;
        selectedPages = pages;
        break;
      }
    }

    return jsonResponse({
      story: selectedStory,
      pages: selectedPages,
      rwLevel,
      wordCount: selectedQuality?.wordCount || countWords(selectedStory),
      research: {
        completed: researchResult.completed,
        status: researchResult.status,
        summary: researchResult.profile?.researchSummary || '',
        profile: researchResult.profile,
        sources: researchResult.sources,
      },
      outline,
      qualityValidation: selectedQuality,
      debug,
      pipelineStatus: selectedQuality?.coherent ? 'pass' : 'partial',
    });
  } catch (error) {
    console.error('Generation error:', error);
    return jsonResponse({
      error: 'Failed to generate story',
      details: error.message,
    }, 500);
  }
}
