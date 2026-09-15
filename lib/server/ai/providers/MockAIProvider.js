import { AIProvider } from './AIProvider';

export class MockAIProvider extends AIProvider {
  async generateStory(payload) {
    // Return a mock story for development/testing
    const { theme, characters, setting, moral } = payload;
    
    // Create a simple mock story based on the theme
    const mockStory = {
      title: `${theme} Adventure`,
      content: `Once upon a time, in a land of ${setting}, there lived ${characters.join(' and ')}. They were on a magical adventure to learn about ${moral}. Together, they discovered wonderful things and learned valuable lessons about friendship and bravery.`,
      moral,
      theme,
      characters,
      setting
    };
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return mockStory;
  }
}