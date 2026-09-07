const BUILT_IN_CONTEXT = {
  simba: ['Savanna', 'young lion', 'friends', 'bravery', 'family'],
  'paw patrol': ['Adventure Bay', 'rescue mission', 'teamwork', 'vehicles'],
  dinosaurs: ['jungle', 'friendly dinosaurs', 'exploration'],
  space: ['planets', 'rocket', 'stars', 'discovery'],
  pirates: ['treasure map', 'ship', 'island', 'clues'],
  dragons: ['kind dragon', 'cave', 'flying', 'magic'],
  superheroes: ['helping others', 'city', 'courage'],
};

export class ThemeResearchService {
  async research(theme) {
    const key = (theme || '').toLowerCase();
    const hints = BUILT_IN_CONTEXT[key] || ['adventure', 'friendship', 'humor', 'safe challenge'];
    return {
      source: 'knowledge-fallback',
      theme,
      hints,
      notes: `Use familiar elements for ${theme} while keeping story fully original.`,
    };
  }
}
