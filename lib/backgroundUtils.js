// Background image utility for story pages
// Using Picsum Photos for placeholder images - free, no API key needed
export const backgroundImages = {
  // Adventure themes (outdoor exploration, mountains, forests)
  'adventure': [
    'https://picsum.photos/id/1015/800/600', // Mountain landscape
    'https://picsum.photos/id/1018/800/600', // Forest path
    'https://picsum.photos/id/1040/800/600', // Camping scene
    'https://picsum.photos/id/1050/800/600', // Mountain lake
  ],
  'animal': [
    'https://picsum.photos/id/1062/800/600', // Puppy
    'https://picsum.photos/id/1074/800/600', // Cat
    'https://picsum.photos/id/1084/800/600', // Bird
    'https://picsum.photos/id/237/800/600',  // Dog
  ],
  'fantasy': [
    'https://picsum.photos/id/119/800/600',  // Mystical forest
    'https://picsum.photos/id/122/800/600',  // Fairy tale castle
    'https://picsum.photos/id/124/800/600',  // Enchanted garden
    'https://picsum.photos/id/128/800/600',  // Magical sunset
  ],
  'nature': [
    'https://picsum.photos/id/129/800/600',  // Green forest
    'https://picsum.photos/id/152/800/600',  // Waterfall
    'https://picsum.photos/id/154/800/600',  // Autumn leaves
    'https://picsum.photos/id/158/800/600',  // Flower field
  ],
  'space': [
    'https://picsum.photos/id/160/800/600',  // Night sky
    'https://picsum.photos/id/164/800/600',  // Stars
    'https://picsum.photos/id/166/800/600',  // Moon
    'https://picsum.photos/id/168/800/600',  // Galaxy
  ],
  'ocean': [
    'https://picsum.photos/id/211/800/600',  // Ocean waves
    'https://picsum.photos/id/249/800/600',  // Beach
    'https://picsum.photos/id/251/800/600',  // Underwater
    'https://picsum.photos/id/257/800/600',  // Coral reef
  ],
  'castle': [
    'https://picsum.photos/id/101/800/600',  // Castle exterior
    'https://picsum.photos/id/103/800/600',  // Castle interior
    'https://picsum.photos/id/105/800/600',  // Medieval architecture
    'https://picsum.photos/id/107/800/600',  // Knight's hall
  ],
  'jungle': [
    'https://picsum.photos/id/301/800/600',  // Tropical forest
    'https://picsum.photos/id/302/800/600',  // Jungle vines
    'https://picsum.photos/id/303/800/600',  // Exotic plants
    'https://picsum.photos/id/304/800/600',  // Rainforest
  ],
  // Default fallbacks (generic child-friendly scenes)
  'default': [
    'https://picsum.photos/id/306/800/600',  // Playful scene
    'https://picsum.photos/id/308/800/600',  // Colorful background
    'https://picsum.photos/id/309/800/600',  // Soft pattern
    'https://picsum.photos/id/311/800/600',  // Whimsical design
  ]
};

// Get background image for a story based on theme
export function getStoryBackground(theme, pageIndex) {
  if (!theme) return backgroundImages.default[pageIndex % 4];
  
  const themeLower = theme.toLowerCase();
  
  // Check theme category map first
  for (const [keyword, category] of Object.entries(themeCategoryMap)) {
    if (themeLower.includes(keyword)) {
      const images = backgroundImages[category] || backgroundImages.default;
      return images[pageIndex % images.length];
    }
  }
  
  // Check direct theme matches
  for (const category of Object.keys(backgroundImages)) {
    if (category !== 'default' && themeLower.includes(category)) {
      const images = backgroundImages[category];
      return images[pageIndex % images.length];
    }
  }
  
  // Fallback to default
  return backgroundImages.default[pageIndex % backgroundImages.default.length];
}

// Map common theme keywords to background categories
export const themeCategoryMap = {
  'dragon': 'fantasy',
  'unicorn': 'fantasy',
  'fairy': 'fantasy',
  'magic': 'fantasy',
  'wizard': 'fantasy',
  'dinosaur': 'animal',
  'lion': 'animal',
  'tiger': 'animal',
  'elephant': 'animal',
  'bear': 'animal',
  'forest': 'nature',
  'mountain': 'nature',
  'river': 'nature',
  'beach': 'nature',
  'garden': 'nature',
  'robot': 'space',
  'rocket': 'space',
  'planet': 'space',
  'alien': 'space',
  'pirate': 'ocean',
  'ship': 'ocean',
  'mermaid': 'ocean',
  'treasure': 'adventure',
  'explorer': 'adventure',
  'quest': 'adventure',
  'knight': 'castle',
  'princess': 'castle',
  'king': 'castle',
  'queen': 'castle',
  'monkey': 'jungle',
  'parrot': 'jungle',
  'snake': 'jungle',
  'tropical': 'jungle',
};