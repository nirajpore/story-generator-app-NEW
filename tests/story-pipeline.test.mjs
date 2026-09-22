import test from 'node:test';
import assert from 'node:assert/strict';
import { computeStoryTargets, splitStoryIntoPages, countWords } from '../lib/story/pipeline.js';

test('initial blue target stays near 360-400 range', () => {
  const target = computeStoryTargets({ rwLevel: 'blue' });
  assert.ok(target.targetWords >= 350 && target.targetWords <= 400);
  assert.ok(target.minimumWords >= 300);
  assert.equal(target.targetPageCountMin, 4);
  assert.equal(target.targetPageCountMax, 6);
});

test('high performance allows gradual target increase', () => {
  const target = computeStoryTargets({
    rwLevel: 'blue',
    previousStoryWordCount: 360,
    recentPerformance: 0.93,
    engagement: 0.9,
  });
  assert.ok(target.targetWords > 400);
});

test('page splitting yields meaningful page count for ~360 words', () => {
  const paragraph = 'Simba and Nala walked carefully through the warm valley and listened to the birds near the river while planning their rescue mission.';
  const longStory = Array.from({ length: 18 }).map(() => paragraph).join('\n\n');
  const words = countWords(longStory);
  assert.ok(words > 350 && words < 450);
  const pages = splitStoryIntoPages(longStory, { minWords: 45, maxWords: 80 });
  assert.ok(pages.length >= 5 && pages.length <= 7);
});
