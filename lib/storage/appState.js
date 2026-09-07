import { DEFAULT_CHILD_PROFILE, DEFAULT_PARENT_PIN, DEFAULT_THEMES, STORAGE_KEY } from '@/lib/constants';

export function createDefaultState() {
  return {
    child: DEFAULT_CHILD_PROFILE,
    parentPin: DEFAULT_PARENT_PIN,
    themes: DEFAULT_THEMES,
    stories: [],
    readingSessions: [],
    difficultWords: {},
    storySeries: {},
    activeSpeechEngine: 'recording-first',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function loadState() {
  if (typeof window === 'undefined') return createDefaultState();
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return createDefaultState();

  try {
    const parsed = JSON.parse(raw);
    return {
      ...createDefaultState(),
      ...parsed,
      child: {
        ...DEFAULT_CHILD_PROFILE,
        ...(parsed.child || {}),
      },
      themes: Array.isArray(parsed.themes) && parsed.themes.length > 0 ? parsed.themes : DEFAULT_THEMES,
      stories: Array.isArray(parsed.stories) ? parsed.stories : [],
      readingSessions: Array.isArray(parsed.readingSessions) ? parsed.readingSessions : [],
      difficultWords: parsed.difficultWords || {},
      storySeries: parsed.storySeries || {},
    };
  } catch (error) {
    console.error('Failed to parse app state:', error);
    return createDefaultState();
  }
}

export function saveState(state) {
  if (typeof window === 'undefined') return;
  const next = { ...state, updatedAt: new Date().toISOString() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}
