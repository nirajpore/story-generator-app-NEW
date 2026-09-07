import { tokenizeForAlignment } from './normalization';

function similarity(a, b) {
  if (a === b) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return (maxLen - dp[a.length][b.length]) / maxLen;
}

function substitutionCost(expected, heard) {
  if (!heard) return 1;
  const score = similarity(expected, heard);
  if (score >= 0.93) return 0.08;
  if (score >= 0.82) return 0.25;
  if (score >= 0.72) return 0.48;
  return 1;
}

export function alignTranscription(expectedText, transcriptText, options = {}) {
  const expectedWords = tokenizeForAlignment(expectedText);
  const heardWords = tokenizeForAlignment(transcriptText);
  const uncertainThreshold = options.uncertainThreshold ?? 0.85;

  const n = expectedWords.length;
  const m = heardWords.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  const trace = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(null));

  for (let i = 1; i <= n; i++) {
    dp[i][0] = i;
    trace[i][0] = 'up';
  }
  for (let j = 1; j <= m; j++) {
    dp[0][j] = j * 0.65;
    trace[0][j] = 'left';
  }

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const subCost = substitutionCost(expectedWords[i - 1], heardWords[j - 1]);
      const diag = dp[i - 1][j - 1] + subCost;
      const up = dp[i - 1][j] + 1;
      const left = dp[i][j - 1] + 0.65;
      const best = Math.min(diag, up, left);
      dp[i][j] = best;
      trace[i][j] = best === diag ? 'diag' : best === up ? 'up' : 'left';
    }
  }

  const rows = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    const move = trace[i][j];
    if (move === 'diag') {
      const expected = expectedWords[i - 1];
      const heard = heardWords[j - 1];
      const sim = similarity(expected, heard);
      const isMatch = expected === heard;
      const isRecognitionDiff = !isMatch && sim >= uncertainThreshold;
      rows.push({
        expected,
        heard,
        similarity: Number(sim.toFixed(3)),
        result: isMatch ? 'match' : isRecognitionDiff ? 'possible_recognition_difference' : 'substitution',
      });
      i -= 1;
      j -= 1;
    } else if (move === 'up') {
      rows.push({
        expected: expectedWords[i - 1],
        heard: '',
        similarity: 0,
        result: 'omission',
      });
      i -= 1;
    } else {
      rows.push({
        expected: '',
        heard: heardWords[j - 1],
        similarity: 0,
        result: 'insertion',
      });
      j -= 1;
    }
  }
  rows.reverse();

  let correct = 0;
  let substitutions = 0;
  let omissions = 0;
  let insertions = 0;
  let possibleRecognitionDifferences = 0;

  for (const row of rows) {
    if (row.result === 'match') correct += 1;
    if (row.result === 'substitution') substitutions += 1;
    if (row.result === 'omission') omissions += 1;
    if (row.result === 'insertion') insertions += 1;
    if (row.result === 'possible_recognition_difference') possibleRecognitionDifferences += 1;
  }

  return {
    expectedWords,
    heardWords,
    rows,
    evidence: {
      wordsExpected: expectedWords.length,
      wordsHeard: heardWords.length,
      wordsMatched: correct,
      substitutions,
      omissions,
      insertions,
      possibleRecognitionDifferences,
    },
  };
}
