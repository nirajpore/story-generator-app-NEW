export const GEMINI_TRANSCRIBE_MODEL = 'gemini-3.5-transcribe';

export function extractTextFromGeminiResponse(responseJson) {
  const parts = responseJson?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts
    .map((part) => (typeof part?.text === 'string' ? part.text : ''))
    .join('\n')
    .trim();
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function parseWordArray(wordsRaw) {
  if (!Array.isArray(wordsRaw)) return [];
  return wordsRaw
    .map((item) => ({
      word: String(item?.word || '').trim(),
      startSec: typeof item?.startSec === 'number' ? item.startSec : null,
      endSec: typeof item?.endSec === 'number' ? item.endSec : null,
      confidence: typeof item?.confidence === 'number' ? clamp(item.confidence, 0, 1) : null,
    }))
    .filter((item) => item.word);
}

function deriveConfidence({ topLevelConfidence, words }) {
  if (typeof topLevelConfidence === 'number') return clamp(topLevelConfidence, 0, 1);
  const withConfidence = words.filter((w) => typeof w.confidence === 'number');
  if (!withConfidence.length) return 0.7;
  return clamp(withConfidence.reduce((acc, item) => acc + item.confidence, 0) / withConfidence.length, 0, 1);
}

export function parseGeminiTranscriptionResponse(responseJson) {
  const text = extractTextFromGeminiResponse(responseJson);
  let parsed = null;
  if (text) {
    try {
      parsed = JSON.parse(text.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim());
    } catch {
      parsed = null;
    }
  }

  if (parsed && typeof parsed === 'object') {
    const words = parseWordArray(parsed.words);
    const transcript = String(parsed.transcript || '').trim();
    const confidence = deriveConfidence({ topLevelConfidence: parsed.confidence, words });
    return {
      transcript,
      confidence: Number(confidence.toFixed(2)),
      words,
      rawText: text,
    };
  }

  return {
    transcript: text,
    confidence: 0.7,
    words: [],
    rawText: text,
  };
}
