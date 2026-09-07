import test from 'node:test';
import assert from 'node:assert/strict';
import { alignTranscription } from '../lib/reading/alignment.js';
import { scoreReading } from '../lib/reading/scoring.js';

const expectedText = `Simba walked slowly through the forest and listened to the wind.
He saw bright birds near a waterfall and smiled at his friend Nala.
Together they followed a winding path and found a missing drum by a fig tree.
They carried it home and everyone celebrated with music under the moon.`;

function words(text) {
  return text.split(/\s+/).filter(Boolean);
}

function omitEveryTenthWord(text) {
  return words(text).filter((_, i) => (i + 1) % 10 !== 0).join(' ');
}

function substituteEveryFifthWord(text) {
  return words(text).map((word, i) => ((i + 1) % 5 === 0 ? 'banana' : word)).join(' ');
}

test('Test 1: perfect transcript gives high score', () => {
  const alignment = alignTranscription(expectedText, expectedText);
  const score = scoreReading({
    alignment,
    durationSeconds: 100,
    transcriptionConfidence: 0.95,
    priorWpm: 130,
  });
  assert.equal(score.canScore, true);
  assert.ok(score.accuracy.score >= 9.5);
  assert.ok(score.overall >= 8);
});

test('Test 2: 10% omitted words lowers accuracy', () => {
  const transcript = omitEveryTenthWord(expectedText);
  const alignment = alignTranscription(expectedText, transcript);
  const score = scoreReading({
    alignment,
    durationSeconds: 100,
    transcriptionConfidence: 0.95,
    priorWpm: 130,
  });
  assert.equal(score.canScore, true);
  assert.ok(score.accuracy.score < 9.5);
});

test('Test 3: 20% substituted words lowers accuracy more', () => {
  const transcript = substituteEveryFifthWord(expectedText);
  const alignment = alignTranscription(expectedText, transcript);
  const score = scoreReading({
    alignment,
    durationSeconds: 100,
    transcriptionConfidence: 0.95,
    priorWpm: 130,
  });
  assert.equal(score.canScore, true);
  assert.ok(score.accuracy.score <= 8.5);
});

test('Test 4: slow but correct keeps accuracy high, speed lower', () => {
  const alignment = alignTranscription(expectedText, expectedText);
  const fastScore = scoreReading({
    alignment,
    durationSeconds: 100,
    transcriptionConfidence: 0.95,
    priorWpm: 130,
  });
  const slowScore = scoreReading({
    alignment,
    durationSeconds: 260,
    transcriptionConfidence: 0.95,
    priorWpm: 130,
  });

  assert.equal(slowScore.canScore, true);
  assert.ok(slowScore.accuracy.score >= 9.5);
  assert.ok(slowScore.speed.score < fastScore.speed.score);
});

test('Test 5: perfect reading + low confidence does not heavily penalise', () => {
  const alignment = alignTranscription(expectedText, expectedText);
  const score = scoreReading({
    alignment,
    durationSeconds: 110,
    transcriptionConfidence: 0.5,
    priorWpm: 130,
  });

  assert.equal(score.canScore, true);
  assert.ok(score.overall >= 7);
});
