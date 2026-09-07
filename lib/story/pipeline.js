const DEFAULT_MINIMUM_WORD_TARGET = 500;

function toWords(text = '') {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

export function countWords(text = '') {
  return toWords(text).length;
}

export function computeStoryTargets({ rwLevel = 'blue', previousStoryWordCount, recentPerformance, engagement } = {}) {
  const baseByLevel = {
    purple: 260,
    pink: 300,
    orange: 360,
    yellow: 430,
    blue: 560,
    grey: 700,
  };

  const baseTarget = baseByLevel[rwLevel] || baseByLevel.blue;
  const previousDelta = typeof previousStoryWordCount === 'number'
    ? Math.max(-80, Math.min(120, Math.round((baseTarget - previousStoryWordCount) * 0.35)))
    : 0;
  const performanceDelta = typeof recentPerformance === 'number'
    ? Math.max(-60, Math.min(150, Math.round((recentPerformance - 0.75) * 280)))
    : 0;
  const engagementDelta = typeof engagement === 'number'
    ? Math.max(-40, Math.min(120, Math.round((engagement - 0.7) * 220)))
    : 0;

  const targetWords = Math.max(250, Math.min(1200, baseTarget + previousDelta + performanceDelta + engagementDelta));
  const minimumWords = Math.max(DEFAULT_MINIMUM_WORD_TARGET, Math.round(targetWords * 0.9));
  const preferredPageWordMin = targetWords < 500 ? 70 : 80;
  const preferredPageWordMax = targetWords > 850 ? 120 : 110;

  return {
    targetWords,
    minimumWords,
    preferredPageWordMin,
    preferredPageWordMax,
  };
}

export function splitStoryIntoPages(storyText, { minWords = 70, maxWords = 120 } = {}) {
  const paragraphs = storyText
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) return [];

  const pages = [];
  let current = [];
  let currentCount = 0;

  const pushCurrent = () => {
    if (current.length) {
      pages.push(current.join('\n\n'));
      current = [];
      currentCount = 0;
    }
  };

  for (const paragraph of paragraphs) {
    const paragraphWords = countWords(paragraph);

    if (paragraphWords > maxWords) {
      const words = toWords(paragraph);
      let chunk = [];
      for (const word of words) {
        chunk.push(word);
        if (chunk.length >= maxWords) {
          if (currentCount < minWords && current.length) {
            current.push(chunk.join(' '));
            pushCurrent();
          } else {
            pushCurrent();
            pages.push(chunk.join(' '));
          }
          chunk = [];
        }
      }
      if (chunk.length > 0) {
        const chunkText = chunk.join(' ');
        const chunkCount = countWords(chunkText);
        if (currentCount + chunkCount > maxWords && currentCount >= minWords) {
          pushCurrent();
        }
        current.push(chunkText);
        currentCount += chunkCount;
      }
      continue;
    }

    if (currentCount + paragraphWords > maxWords && currentCount >= minWords) {
      pushCurrent();
    }

    current.push(paragraph);
    currentCount += paragraphWords;
  }

  if (current.length) {
    pages.push(current.join('\n\n'));
  }

  if (pages.length > 1) {
    const lastCount = countWords(pages[pages.length - 1]);
    if (lastCount < Math.floor(minWords * 0.55)) {
      const tail = pages.pop();
      pages[pages.length - 1] = `${pages[pages.length - 1]}\n\n${tail}`;
    }
  }

  return pages;
}

function hasNarrativeMarkers(storyText) {
  const lower = storyText.toLowerCase();
  const beginning = /(one morning|one day|once|at the start|in the beginning)/.test(lower);
  const conflict = /(problem|suddenly|but then|however|challenge|could not)/.test(lower);
  const climax = /(at last|finally|just then|in that moment)/.test(lower);
  const resolution = /(in the end|from that day|everyone|solved|learned|happy)/.test(lower);
  return beginning && conflict && climax && resolution;
}

export function validateStoryLocally({
  storyText,
  theme,
  minimumWords,
  pageWordMin,
  pageWordMax,
  pages,
}) {
  const wordCount = countWords(storyText);
  const lowerStory = storyText.toLowerCase();
  const themeCovered = theme ? lowerStory.includes(theme.toLowerCase().split(/\s+/)[0]) : true;
  const pageLengths = pages.map((page) => countWords(page));
  const pageLengthValid = pageLengths.every((count) => count >= Math.floor(pageWordMin * 0.75) && count <= Math.ceil(pageWordMax * 1.25));
  const sufficientLength = wordCount >= minimumWords;
  const narrativeComplete = hasNarrativeMarkers(storyText);
  const coherent = sufficientLength && narrativeComplete && themeCovered;
  const qualityScore = Math.max(
    1,
    Math.min(
      10,
      (sufficientLength ? 4 : 1.5) +
        (narrativeComplete ? 3 : 1) +
        (themeCovered ? 2 : 0.8) +
        (pageLengthValid ? 1 : 0.5)
    )
  );

  const issues = [];
  if (!sufficientLength) issues.push(`Story too short: ${wordCount} words, minimum ${minimumWords}`);
  if (!themeCovered) issues.push('Theme relevance check failed');
  if (!narrativeComplete) issues.push('Story is missing clear narrative progression');
  if (!pageLengthValid) issues.push('Page length distribution out of range');

  return {
    coherent,
    ageAppropriate: true,
    hasBeginningMiddleEnd: narrativeComplete,
    characterConsistency: true,
    difficultyAppropriate: true,
    sufficientLength,
    pageLengthValid,
    qualityScore: Number(qualityScore.toFixed(2)),
    issues,
    wordCount,
    pageLengths,
  };
}
