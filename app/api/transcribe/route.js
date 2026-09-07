import {
  GEMINI_TRANSCRIBE_MODEL,
  parseGeminiTranscriptionResponse,
} from '@/lib/reading/transcription';

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function toBase64(buffer) {
  return Buffer.from(buffer).toString('base64');
}

async function callGeminiTranscription({ apiKey, audioBase64, mimeType }) {
  const prompt = `You are transcribing a child reading practice recording.
Return strict JSON:
{
  "transcript": "verbatim transcript exactly as spoken",
  "confidence": 0.0,
  "words": [
    { "word": "hello", "startSec": 0.12, "endSec": 0.44, "confidence": 0.91 }
  ]
}

Rules:
- Use VERBATIM style: do not rewrite grammar or wording.
- Keep repetitions and disfluencies.
- If uncertain, keep best guess and lower confidence.
- Do not add commentary. JSON only.`;

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType,
              data: audioBase64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 4096,
      responseMimeType: 'application/json',
    },
  };

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TRANSCRIBE_MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Gemini transcription failed (${response.status}): ${body}`);
  }

  return response.json();
}

export async function POST(request) {
  try {
    const geminiToken = process.env.GEMINI_API_KEY;
    if (!geminiToken) {
      return jsonResponse(
        { error: 'GEMINI_API_KEY is not configured for server-side transcription.' },
        500
      );
    }

    const formData = await request.formData();
    const audioFile = formData.get('audio');
    if (!audioFile || typeof audioFile.arrayBuffer !== 'function') {
      return jsonResponse({ error: 'Audio file is required.' }, 400);
    }

    const mimeType = audioFile.type || 'audio/webm';
    const buffer = await audioFile.arrayBuffer();
    if (!buffer || buffer.byteLength === 0) {
      return jsonResponse({ error: 'Audio file was empty.' }, 400);
    }

    const audioBase64 = toBase64(buffer);
    const geminiResponse = await callGeminiTranscription({
      apiKey: geminiToken,
      audioBase64,
      mimeType,
    });

    const parsed = parseGeminiTranscriptionResponse(geminiResponse);
    if (!parsed.transcript) {
      return jsonResponse(
        {
          error: 'Transcription succeeded but no transcript text was returned.',
          model: GEMINI_TRANSCRIBE_MODEL,
        },
        422
      );
    }

    return jsonResponse({
      transcript: parsed.transcript,
      confidence: parsed.confidence,
      words: parsed.words,
      model: GEMINI_TRANSCRIBE_MODEL,
      raw: parsed.rawText,
    });
  } catch (error) {
    console.error('Transcription error:', error);
    return jsonResponse(
      {
        error: 'Failed to transcribe audio.',
        details: error.message,
      },
      500
    );
  }
}
