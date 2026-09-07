import test from 'node:test';
import assert from 'node:assert/strict';
import { parseGeminiTranscriptionResponse } from '../lib/reading/transcription.js';

test('parses structured JSON transcript with words and confidence', () => {
  const response = {
    candidates: [
      {
        content: {
          parts: [
            {
              text: JSON.stringify({
                transcript: 'simba walked through the forest',
                confidence: 0.92,
                words: [
                  { word: 'simba', startSec: 0.1, endSec: 0.3, confidence: 0.95 },
                  { word: 'walked', startSec: 0.4, endSec: 0.7, confidence: 0.91 },
                ],
              }),
            },
          ],
        },
      },
    ],
  };

  const parsed = parseGeminiTranscriptionResponse(response);
  assert.equal(parsed.transcript, 'simba walked through the forest');
  assert.equal(parsed.confidence, 0.92);
  assert.equal(parsed.words.length, 2);
  assert.equal(parsed.words[0].word, 'simba');
});

test('falls back to plain text response', () => {
  const response = {
    candidates: [
      {
        content: {
          parts: [
            {
              text: 'simba walked through the forest',
            },
          ],
        },
      },
    ],
  };

  const parsed = parseGeminiTranscriptionResponse(response);
  assert.equal(parsed.transcript, 'simba walked through the forest');
  assert.equal(parsed.words.length, 0);
  assert.equal(parsed.confidence, 0.7);
});
