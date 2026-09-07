function normalize(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9'\s?!.,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(text) {
  return normalize(text)
    .replace(/[?!.,]/g, '')
    .split(' ')
    .filter(Boolean);
}

function similarity(a, b) {
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  const max = Math.max(a.length, b.length);
  let matches = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i += 1) {
    if (a[i] === b[i]) matches += 1;
  }
  return matches / max;
}

export function analyzeReading({ storyText, transcript, durationSeconds, recognitionConfidence = 0.6, previousBest = 0 }) {
  const expected = tokenize(storyText);
  const heard = tokenize(transcript);
  const mistakes = [];

  let matched = 0;
  for (let i = 0; i < expected.length; i += 1) {
    const word = expected[i];
    const spoken = heard[i];
    if (!spoken) {
      mistakes.push({ word, type: 'possible_mistake', confidence: 0.45 });
      continue;
    }
    const score = similarity(word, spoken);
    if (score >= 0.8) {
      matched += 1;
    } else if (score >= 0.55 || recognitionConfidence < 0.55) {
      mistakes.push({ word, spoken, type: 'recognition_uncertain', confidence: score });
    } else {
      mistakes.push({ word, spoken, type: 'confirmed_mistake', confidence: score });
    }
  }

  const accuracy = expected.length ? (matched / expected.length) * 100 : 0;
  const wordsPerMinute = durationSeconds > 0 ? Math.round((matched / durationSeconds) * 60) : 0;
  const punctuationMarks = (storyText.match(/[?!.,]/g) || []).length;
  const pauseDensity = punctuationMarks > 0 ? Math.min(100, Math.round((durationSeconds / punctuationMarks) * 10)) : 70;
  const fluency = Math.max(40, Math.min(100, Math.round((accuracy * 0.65) + (recognitionConfidence * 35))));
  const expression = Math.max(45, Math.min(100, Math.round((pauseDensity * 0.4) + (accuracy * 0.4) + 20)));
  const speed = Math.max(50, Math.min(100, Math.round((wordsPerMinute / 2.2) * 10)));
  const improvement = Math.max(0, Math.min(100, Math.round((accuracy - previousBest) + 50)));

  const scoreRaw = (
    (accuracy * 0.28) +
    (fluency * 0.2) +
    (speed * 0.14) +
    (pauseDensity * 0.14) +
    (expression * 0.14) +
    (improvement * 0.1)
  ) / 10;
  const score = Math.max(1, Math.min(10, Number(scoreRaw.toFixed(1))));

  const message = score >= 8
    ? '🌟 New best score! Your reading sounded expressive and strong!'
    : score >= 6
      ? '🎉 Great job finishing the whole story. Keep your adventure going!'
      : '💪 That was a tricky adventure — but you kept going!';

  return {
    score,
    accuracy: Math.round(accuracy),
    fluency,
    speed: wordsPerMinute,
    punctuation: pauseDensity,
    expression,
    improvement,
    wordsPerMinute,
    durationSeconds,
    mistakes,
    recognitionConfidence,
    childMessage: message,
  };
}

export function mergeDifficultWords(existingMap = {}, mistakes = []) {
  const next = { ...existingMap };
  mistakes.forEach((item) => {
    if (!item.word) return;
    const key = item.word.toLowerCase();
    const curr = next[key] || { word: key, attempts: 0, correct: 0, missed: 0, confidence: 0.7 };
    curr.attempts += 1;
    if (item.type === 'confirmed_mistake') {
      curr.missed += 1;
    } else if (item.type === 'recognition_uncertain') {
      curr.confidence = Number(((curr.confidence + 0.5) / 2).toFixed(2));
    } else {
      curr.correct += 1;
    }
    next[key] = curr;
  });
  return next;
}
