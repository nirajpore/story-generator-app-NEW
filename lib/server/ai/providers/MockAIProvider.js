import { AIProvider } from './AIProvider';

export class MockAIProvider extends AIProvider {
  async generateStory(payload) {
    // Return a mock story in the correct format
    const { theme } = payload || {};
    
    // Create pages
    const pages = [
      {
        pageNumber: 1,
        text: `Once upon a time, there was a friendly character who loved adventures.`,
        illustrationPrompt: "A friendly character smiling in a magical forest"
      },
      {
        pageNumber: 2,
        text: `One day, the character found a mysterious map that led to a hidden treasure.`,
        illustrationPrompt: "A character holding a treasure map with excitement"
      },
      {
        pageNumber: 3,
        text: `After a fun journey, the treasure was discovered - it was friendship all along!`,
        illustrationPrompt: "Happy characters celebrating together with sparkles"
      }
    ];
    
    // Create a mock story in the correct format
    const mockStory = {
      title: `${theme || 'Adventure'} Adventure`,
      theme: theme || 'adventure',
      difficulty: 'blue',
      pages: pages,
      wordCount: 45,
      metadata: {
        cliffhanger: "What new adventure will tomorrow bring?"
      }
    };
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return mockStory;
  }
}