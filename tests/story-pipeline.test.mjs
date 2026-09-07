import test from 'node:test';
import assert from 'node:assert/strict';
import { computeStoryTargets, splitStoryIntoPages, countWords } from '../lib/story/pipeline.js';

test('initial blue target stays near 250-300 range', () => {
  const target = computeStoryTargets({ rwLevel: 'blue' });
  assert.ok(target.targetWords >= 250 && target.targetWords <= 310);
  assert.ok(target.minimumWords >= 250);
  assert.equal(target.targetPageCountMin, 3);
  assert.equal(target.targetPageCountMax, 5);
});

test('high performance allows gradual target increase', () => {
  const target = computeStoryTargets({
    rwLevel: 'blue',
    previousStoryWordCount: 360,
    recentPerformance: 0.93,
    engagement: 0.9,
  });
  assert.ok(target.targetWords > 320);
});

test('page splitting yields meaningful page count for ~280 words', () => {
  const paragraph = 'Simba and Nala walked carefully through the warm valley and listened to the birds near the river while planning their rescue mission.';
  const longStory = Array.from({ length: 13 }).map(() => paragraph).join('\n\n');
  const words = countWords(longStory);
  assert.ok(words > 250 && words < 350);
  const pages = splitStoryIntoPages(longStory, { minWords: 55, maxWords: 95 });
  assert.ok(pages.length >= 3 && pages.length <= 5);
});
