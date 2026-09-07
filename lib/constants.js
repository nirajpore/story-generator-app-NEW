export const INTERNAL_LEVELS = [
  'red',
  'pink',
  'purple',
  'orange',
  'yellow',
  'green',
  'turquoise',
  'blue',
  'grey',
];

export const CHILD_LEVEL_LABELS = [
  '🌟 Reading Adventure 1',
  '🌟 Reading Adventure 2',
  '🌟 Reading Adventure 3',
  '🌟 Reading Adventure 4',
  '🌟 Reading Adventure 5',
  '🌟 Reading Adventure 6',
  '🌟 Reading Adventure 7',
  '🌟 Reading Adventure 8',
  '🌟 Reading Adventure 9',
];

export const DEFAULT_THEMES = [
  { id: 'simba', name: 'Simba', emoji: '🦁', favorite: true, order: 1 },
  { id: 'paw-patrol', name: 'PAW Patrol', emoji: '🐾', favorite: true, order: 2 },
  { id: 'dinosaurs', name: 'Dinosaurs', emoji: '🦖', favorite: false, order: 3 },
  { id: 'space', name: 'Space', emoji: '🚀', favorite: false, order: 4 },
  { id: 'superheroes', name: 'Superheroes', emoji: '🦸', favorite: false, order: 5 },
  { id: 'pirates', name: 'Pirates', emoji: '🏴‍☠️', favorite: false, order: 6 },
  { id: 'dragons', name: 'Dragons', emoji: '🐉', favorite: false, order: 7 },
];

export const DEFAULT_CHILD_PROFILE = {
  name: 'Reader',
  currentLevel: 'blue',
  levelProgress: 0.85,
  nextMilestone: 'grey',
  readingHistory: [],
  vocabulary: {},
  preferences: {
    preferredLength: 'short',
    keepAudio: false,
  },
};

export const DEFAULT_PARENT_PIN = '2468';

export const STORAGE_KEY = 'reading_coach_state_v1';
