export const APP_STATE_KEY = 'reading_coach_state_v1';

const DEFAULT_STATE = {
  version: 1,
  stories: [],
  readingSessions: [],
  difficultWords: {},
  settings: {},
  childProfile: {
    rwLevel: 'blue',
    stageProgress: {
      blue: 0.85,
      grey: 0.1,
    },
  },
};

export function loadAppState() {
  if (typeof window === 'undefined') return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(APP_STATE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_STATE,
      ...parsed,
      childProfile: {
        ...DEFAULT_STATE.childProfile,
        ...(parsed?.childProfile || {}),
      },
      settings: {
        ...DEFAULT_STATE.settings,
        ...(parsed?.settings || {}),
      },
      difficultWords: {
        ...DEFAULT_STATE.difficultWords,
        ...(parsed?.difficultWords || {}),
      },
    };
  } catch {
    return DEFAULT_STATE;
  }
}

export function saveAppState(state) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(APP_STATE_KEY, JSON.stringify(state));
}

export function summarizeRecentPerformance(readingSessions = []) {
  const last = readingSessions.slice(0, 5);
  if (!last.length) {
    return {
      recentPerformance: undefined,
      engagement: undefined,
      avgWpm: undefined,
    };
  }
  const scores = last
    .map((session) => session?.score?.overall)
    .filter((value) => typeof value === 'number');
  const coverage = last
    .map((session) => {
      const expected = session?.score?.accuracy?.evidence?.wordsExpected;
      const matched = session?.score?.accuracy?.evidence?.wordsMatched;
      if (typeof expected !== 'number' || expected <= 0 || typeof matched !== 'number') return null;
      return matched / expected;
    })
    .filter((value) => typeof value === 'number');
  const wpmValues = last
    .map((session) => session?.score?.speed?.evidence?.wordsPerMinute)
    .filter((value) => typeof value === 'number');

  const average = (arr) => arr.reduce((acc, value) => acc + value, 0) / arr.length;
  return {
    recentPerformance: scores.length ? Math.max(0, Math.min(1, average(scores) / 10)) : undefined,
    engagement: coverage.length ? Math.max(0, Math.min(1, average(coverage))) : undefined,
    avgWpm: wpmValues.length ? Number(average(wpmValues).toFixed(1)) : undefined,
  };
}

export function updateDifficultWords(existing = {}, readingAnalysis, timestamp) {
  const rows = readingAnalysis?.alignment?.rows || [];
  const next = { ...existing };

  for (const row of rows) {
    const word = (row.expected || '').toLowerCase().trim();
    if (!word) continue;
    const current = next[word] || {
      word,
      attempts: 0,
      correct: 0,
      missed: 0,
      uncertain: 0,
      lastSeen: null,
      averageReadingTime: null,
    };
    current.attempts += 1;
    if (row.result === 'match') current.correct += 1;
    if (row.result === 'omission' || row.result === 'substitution') current.missed += 1;
    if (row.result === 'possible_recognition_difference') current.uncertain += 1;
    current.lastSeen = timestamp;

    const duration = readingAnalysis?.durationSeconds;
    if (typeof duration === 'number' && duration > 0) {
      const previous = current.averageReadingTime || 0;
      const count = Math.max(1, current.attempts);
      current.averageReadingTime = Number(((previous * (count - 1) + duration) / count).toFixed(2));
    }

    next[word] = current;
  }

  return next;
}
