export class AIProvider {
  constructor({ provider, model }) {
    this.provider = provider;
    this.model = model;
  }

  async generateStory() {
    throw new Error('AIProvider.generateStory must be implemented by subclasses');
  }
}
