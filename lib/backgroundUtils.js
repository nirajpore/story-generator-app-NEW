// Background image utility for story pages
// Using Picsum Photos for placeholder images - free, no API key needed
export const backgroundImages = {
  // Adventure themes (outdoor exploration, mountains, forests)
  'adventure': [
    'https://picsum.photos/id/1015/1920/1080', // Mountain landscape
    'https://picsum.photos/id/1018/1920/1080', // Forest path
    'https://picsum.photos/id/1040/1920/1080', // Camping scene
    'https://picsum.photos/id/1050/1920/1080', // Mountain lake
  ],
  'animal': [
    'https://picsum.photos/id/1062/1920/1080', // Puppy
    'https://picsum.photos/id/1074/1920/1080', // Cat
    'https://picsum.photos/id/1084/1920/1080', // Bird
    'https://picsum.photos/id/237/1920/1080',  // Dog
  ],
  'fantasy': [
    'https://picsum.photos/id/119/1920/1080',  // Mystical forest
    'https://picsum.photos/id/122/1920/1080',  // Fairy tale castle
    'https://picsum.photos/id/124/1920/1080',  // Enchanted garden
    'https://picsum.photos/id/128/1920/1080',  // Magical sunset
  ],
  'nature': [
    'https://picsum.photos/id/129/1920/1080',  // Green forest
    'https://picsum.photos/id/152/1920/1080',  // Waterfall
    'https://picsum.photos/id/154/1920/1080',  // Autumn leaves
    'https://picsum.photos/id/158/1920/1080',  // Flower field
  ],
  'space': [
    'https://picsum.photos/id/160/1920/1080',  // Night sky
    'https://picsum.photos/id/164/1920/1080',  // Stars
    'https://picsum.photos/id/166/1920/1080',  // Moon
    'https://picsum.photos/id/168/1920/1080',  // Galaxy
  ],
  'ocean': [
    'https://picsum.photos/id/211/1920/1080',  // Ocean waves
    'https://picsum.photos/id/249/1920/1080',  // Beach
    'https://picsum.photos/id/251/1920/1080',  // Underwater
    'https://picsum.photos/id/257/1920/1080',  // Coral reef
  ],
  'castle': [
    'https://picsum.photos/id/101/1920/1080',  // Castle exterior
    'https://picsum.photos/id/103/1920/1080',  // Castle interior
    'https://picsum.photos/id/105/1920/1080',  // Medieval architecture
    'https://picsum.photos/id/107/1920/1080',  // Knight's hall
  ],
  'jungle': [
    'https://picsum.photos/id/301/1920/1080',  // Tropical forest
    'https://picsum.photos/id/302/1920/1080',  // Jungle vines
    'https://picsum.photos/id/303/1920/1080',  // Exotic plants
    'https://picsum.photos/id/304/1920/1080',  // Rainforest
  ],
  // Default fallbacks (generic child-friendly scenes)
  'default': [
    'https://picsum.photos/id/306/1920/1080',  // Playful scene
    'https://picsum.photos/id/308/1920/1080',  // Colorful background
    'https://picsum.photos/id/309/1920/1080',  // Soft pattern
    'https://picsum.photos/id/311/1920/1080',  // Whimsical design
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