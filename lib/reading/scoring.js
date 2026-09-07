const DEFAULT_WEIGHTS = {
  accuracy: 0.5,
  fluency: 0.2,
  speed: 0.1,
  punctuation: 0.1,
  expression: 0.1,
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function to10(rawScore) {
  return Number(clamp(rawScore, 0, 10).toFixed(2));
}

export function scoreReading({
  alignment,
  durationSeconds,
  priorWpm,
  transcriptionConfidence = 0.9,
  weights = DEFAULT_WEIGHTS,
}) {
  if (!alignment || !alignment.evidence || alignment.evidence.wordsExpected < 10) {
    return {
      canScore: false,
      reason: 'Not enough evidence to score',
    };
  }

  const evidence = alignment.evidence;
  const wordsExpected = evidence.wordsExpected;
  const recognitionSafeErrors = evidence.substitutions + evidence.omissions;
  const uncertainBuffer = Math.round(evidence.possibleRecognitionDifferences * 0.8);
  const effectiveErrors = Math.max(0, recognitionSafeErrors - uncertainBuffer);

  const accuracyRatio = clamp((wordsExpected - effectiveErrors) / wordsExpected, 0, 1);
  const accuracyScore = to10(accuracyRatio * 10);

  const wordsPerMinute = durationSeconds > 0 ? (evidence.wordsHeard / (durationSeconds / 60)) : 0;
  const expectedWpm = priorWpm || 125;
  const speedRatio = expectedWpm > 0 ? wordsPerMinute / expectedWpm : 1;
  const speedScore = to10(
    speedRatio < 0.65 ? 5.5 :
    speedRatio < 0.8 ? 6.8 :
    speedRatio <= 1.25 ? 8.8 :
    speedRatio <= 1.5 ? 7.6 : 6.2
  );

  const repeatedInsertions = evidence.insertions;
  const hesitationEstimate = Math.max(0, Math.round(repeatedInsertions * 0.6));
  const restartEstimate = Math.max(0, Math.round(repeatedInsertions * 0.15));
  const fluencyPenalty = hesitationEstimate * 0.35 + restartEstimate * 0.45;
  const fluencyScore = to10(9.2 - fluencyPenalty);

  const punctuationConfidence = clamp(0.55 + transcriptionConfidence * 0.3, 0, 1);
  const punctuationScore = to10(7.5 + accuracyRatio * 1.8);
  const expressionConfidence = clamp(0.35 + transcriptionConfidence * 0.4, 0, 1);
  const expressionScore = to10(7.2 + accuracyRatio * 1.5);

  if (transcriptionConfidence < 0.45) {
    return {
      canScore: false,
      reason: 'Low transcription confidence',
      confidence: transcriptionConfidence,
      alignmentEvidence: evidence,
    };
  }

  const overallRaw =
    accuracyScore * weights.accuracy +
    fluencyScore * weights.fluency +
    speedScore * weights.speed +
    punctuationScore * weights.punctuation * punctuationConfidence +
    expressionScore * weights.expression * expressionConfidence;

  const weightedNormalization =
    weights.accuracy +
    weights.fluency +
    weights.speed +
    weights.punctuation * punctuationConfidence +
    weights.expression * expressionConfidence;

  const overall = to10(overallRaw / weightedNormalization);

  return {
    canScore: true,
    overall,
    confidence: Number(clamp((transcriptionConfidence + accuracyRatio) / 2, 0, 1).toFixed(2)),
    accuracy: {
      score: accuracyScore,
      confidence: Number(clamp(0.7 + accuracyRatio * 0.3, 0, 1).toFixed(2)),
      evidence: {
        wordsExpected,
        wordsMatched: evidence.wordsMatched,
        wordsMissed: effectiveErrors,
        substitutions: evidence.substitutions,
        omissions: evidence.omissions,
        possibleRecognitionDifferences: evidence.possibleRecognitionDifferences,
      },
    },
    fluency: {
      score: fluencyScore,
      confidence: Number(clamp(0.55 + transcriptionConfidence * 0.35, 0, 1).toFixed(2)),
      evidence: {
        hesitations: hesitationEstimate,
        restarts: restartEstimate,
      },
    },
    speed: {
      score: speedScore,
      confidence: Number(clamp(0.65 + transcriptionConfidence * 0.25, 0, 1).toFixed(2)),
      evidence: {
        durationSeconds,
        wordsPerMinute: Number(wordsPerMinute.toFixed(1)),
        expectedWpm,
      },
    },
    punctuation: {
      score: punctuationScore,
      confidence: Number(punctuationConfidence.toFixed(2)),
      evidence: {
        expectedPauses: Math.max(1, Math.round(wordsExpected / 14)),
        detectedAppropriatePauses: Math.max(0, Math.round((wordsExpected / 14) * punctuationConfidence)),
      },
    },
    expression: {
      score: expressionScore,
      confidence: Number(expressionConfidence.toFixed(2)),
    },
  };
}
