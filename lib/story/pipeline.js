const DEFAULT_MINIMUM_WORD_TARGET = 250;

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
    purple: 252,
    pink: 262,
    orange: 272,
    yellow: 282,
    blue: 292,
    grey: 302,
  };

  const baseTarget = baseByLevel[rwLevel] || baseByLevel.blue;
  const previousDelta = typeof previousStoryWordCount === 'number'
    ? Math.max(-40, Math.min(70, Math.round((baseTarget - previousStoryWordCount) * 0.22)))
    : 0;
  const performanceDelta = typeof recentPerformance === 'number'
    ? Math.max(-25, Math.min(80, Math.round((recentPerformance - 0.78) * 180)))
    : 0;
  const engagementDelta = typeof engagement === 'number'
    ? Math.max(-20, Math.min(60, Math.round((engagement - 0.72) * 140)))
    : 0;

  let targetWords = baseTarget + previousDelta + performanceDelta + engagementDelta;

  if (typeof recentPerformance === 'number' && recentPerformance >= 0.9) {
    targetWords += 35;
  } else if (typeof recentPerformance === 'number' && recentPerformance < 0.65) {
    targetWords -= 18;
  }

  if (typeof previousStoryWordCount === 'number' && previousStoryWordCount > 340 && recentPerformance >= 0.88) {
    targetWords += 55;
  }

  targetWords = Math.max(250, Math.min(1200, Math.round(targetWords)));

  const minimumWords = Math.max(DEFAULT_MINIMUM_WORD_TARGET, Math.round(targetWords * 0.92));
  const preferredPageWordMin = targetWords <= 320 ? 55 : targetWords < 550 ? 70 : 85;
  const preferredPageWordMax = targetWords <= 320 ? 95 : targetWords < 900 ? 120 : 140;
  const targetPageCountMin = targetWords <= 320 ? 3 : targetWords < 700 ? 5 : 6;
  const targetPageCountMax = targetWords <= 320 ? 5 : targetWords < 700 ? 8 : 10;

  return {
    targetWords,
    minimumWords,
    preferredPageWordMin,
    preferredPageWordMax,
    targetPageCountMin,
    targetPageCountMax,
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
  pageCountMin = 3,
  pageCountMax = 10,
  pages,
}) {
  const wordCount = countWords(storyText);
  const lowerStory = storyText.toLowerCase();
  const themeCovered = theme ? lowerStory.includes(theme.toLowerCase().split(/\s+/)[0]) : true;
  const pageLengths = pages.map((page) => countWords(page));
  const pageLengthValid = pageLengths.every((count) => count >= Math.floor(pageWordMin * 0.75) && count <= Math.ceil(pageWordMax * 1.25));
  const pageCountValid = pages.length >= pageCountMin && pages.length <= pageCountMax;
  const sufficientLength = wordCount >= minimumWords;
  const narrativeComplete = hasNarrativeMarkers(storyText);
  const coherent = sufficientLength && narrativeComplete && themeCovered && pageCountValid;
  const qualityScore = Math.max(
    1,
    Math.min(
      10,
      (sufficientLength ? 4 : 1.5) +
        (narrativeComplete ? 3 : 1) +
        (themeCovered ? 2 : 0.8) +
        (pageLengthValid ? 0.5 : 0.25) +
        (pageCountValid ? 0.5 : 0.25)
    )
  );

  const issues = [];
  if (!sufficientLength) issues.push(`Story too short: ${wordCount} words, minimum ${minimumWords}`);
  if (!themeCovered) issues.push('Theme relevance check failed');
  if (!narrativeComplete) issues.push('Story is missing clear narrative progression');
  if (!pageLengthValid) issues.push('Page length distribution out of range');
  if (!pageCountValid) issues.push(`Page count out of target range (${pageCountMin}-${pageCountMax})`);

  return {
    coherent,
    ageAppropriate: true,
    hasBeginningMiddleEnd: narrativeComplete,
    characterConsistency: true,
    difficultyAppropriate: true,
    sufficientLength,
    pageLengthValid,
    pageCountValid,
    qualityScore: Number(qualityScore.toFixed(2)),
    issues,
    wordCount,
    pageLengths,
  };
}
