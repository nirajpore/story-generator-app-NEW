// Improved Levenshtein distance function for better fuzzy matching
function levenshteinDistance(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  
  const matrix = [];
  
  // Initialize matrix
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  
  // Fill matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  
  return matrix[b.length][a.length];
}

function normalize(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9'\s?!.,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(text) {
  return normalize(text)
    .replace(/[?!.,]/g, '')
    .split(' ')
    .filter(Boolean);
}

// Words to ignore from scoring - common grammar words that don't matter for reading comprehension
const IGNORE_WORDS = new Set([
  'a', 'an', 'the', // articles
  'and', 'or', 'but', 'if', 'so', // conjunctions
  'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', // prepositions
  'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being', // forms of 'be'
  'have', 'has', 'had', 'do', 'does', 'did', // auxiliary verbs
  'i', 'you', 'he', 'she', 'it', 'we', 'they', // pronouns
  'my', 'your', 'his', 'her', 'its', 'our', 'their', // possessive pronouns
  'this', 'that', 'these', 'those', // demonstratives
  'very', 'just', 'really', 'quite' // common adverbs
]);

// Important content words that should be weighted more heavily
const IMPORTANT_WORDS = new Set([
  // Common nouns in children's stories
  'sun', 'moon', 'star', 'tree', 'flower', 'bird', 'cat', 'dog', 'house', 'friend',
  'king', 'queen', 'prince', 'princess', 'dragon', 'castle', 'forest', 'river',
  'book', 'story', 'adventure', 'magic', 'treasure', 'secret', 'journey'
]);

function similarity(a, b) {
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  
  // Clean both words
  const cleanA = a.replace(/[.,!?;:]$/, '').toLowerCase();
  const cleanB = b.replace(/[.,!?;:]$/, '').toLowerCase();
  
  // Exact match
  if (cleanA === cleanB) return 1.0;
  
  // One contains the other (e.g., "book" vs "books")
  if (cleanA.includes(cleanB) || cleanB.includes(cleanA)) {
    const longer = cleanA.length > cleanB.length ? cleanA : cleanB;
    const shorter = cleanA.length > cleanB.length ? cleanB : cleanA;
    return 0.95 + (shorter.length / longer.length) * 0.05;
  }
  
  // Check for common child reading variations
  const commonVariations = {
    // Sound-alike words
    'knight': 'night',
    'through': 'threw',
    'their': 'there',
    'your': 'you\'re',
    'its': 'it\'s',
    'sun': 'son',
    'sea': 'see',
    'bee': 'be',
    'flower': 'flour',
    'right': 'write',
    // Common child mispronunciations
    'the': 'da', 'the': 'duh',
    'and': 'an', 'and': 'end',
    'his': 'is', 'his': 'he\'s',
    'was': 'wuz',
    'with': 'wif',
    'this': 'dis',
    'that': 'dat',
    'they': 'dey'
  };
  
  // Check both directions
  if (commonVariations[cleanA] === cleanB || commonVariations[cleanB] === cleanA) {
    return 0.9; // Common child variation, not a real mistake
  }
  
  // Check for phonetic similarities
  const phoneticGroups = [
    ['b', 'p', 'v'], ['d', 't'], ['f', 'v'], ['g', 'k'], ['m', 'n'],
    ['s', 'z', 'th'], ['ch', 'sh', 'j'], ['l', 'r'], ['w', 'wh']
  ];
  
  // If words are same length and differ by one phonetic letter, give high score
  if (cleanA.length === cleanB.length && cleanA.length > 2) {
    let differences = 0;
    for (let i = 0; i < cleanA.length; i++) {
      if (cleanA[i] !== cleanB[i]) {
        // Check if they're in same phonetic group
        let inSameGroup = false;
        for (const group of phoneticGroups) {
          if (group.includes(cleanA[i]) && group.includes(cleanB[i])) {
            inSameGroup = true;
            break;
          }
        }
        if (!inSameGroup) differences++;
      }
    }
    if (differences <= 1) return 0.85;
  }
  
  // Calculate Levenshtein distance for accurate similarity
  const distance = levenshteinDistance(cleanA, cleanB);
  const maxLength = Math.max(cleanA.length, cleanB.length);
  
  // Similarity score based on edit distance
  const similarityScore = 1 - (distance / maxLength);
  
  // Adjust for child reading - be more forgiving
  if (cleanA.length <= 3 || cleanB.length <= 3) {
    // Very forgiving for short words
    return Math.max(similarityScore, 0.6);
  }
  
  return similarityScore;
}

function findBestMatch(expectedWord, heardWords, usedHearings) {
  let bestMatch = null;
  let bestScore = 0;
  let bestIndex = -1;
  
  for (let i = 0; i < heardWords.length; i++) {
    if (usedHearings.has(i)) continue; // Skip already matched words
    
    const score = similarity(expectedWord, heardWords[i]);
    if (score > bestScore && score >= 0.6) { // Lower threshold for matching
      bestScore = score;
      bestMatch = heardWords[i];
      bestIndex = i;
    }
  }
  
  return { word: bestMatch, score: bestScore, index: bestIndex };
}

export function analyzeReading({ storyText, transcript, durationSeconds, recognitionConfidence = 0.6, previousBest = 0 }) {
  const expectedWords = tokenize(storyText);
  const heardWords = tokenize(transcript);
  
  // Track which heard words have been matched
  const usedHearings = new Set();
  const matches = [];
  const mistakes = [];
  
  // First pass: try to match each expected word with the best available heard word
  for (let i = 0; i < expectedWords.length; i++) {
    const expectedWord = expectedWords[i];
    
    // Skip ignored words from scoring (but still track them)
    const isIgnored = IGNORE_WORDS.has(expectedWord.toLowerCase());
    
    const matchResult = findBestMatch(expectedWord, heardWords, usedHearings);
    
    if (matchResult.score >= 0.8 || (isIgnored && matchResult.score >= 0.6)) {
      // Good match
      matches.push({
        expected: expectedWord,
        heard: matchResult.word,
        score: matchResult.score,
        isIgnored
      });
      if (matchResult.index !== -1) {
        usedHearings.add(matchResult.index);
      }
    } else if (matchResult.score >= 0.5) {
      // Partial match - count as match but with lower confidence
      matches.push({
        expected: expectedWord,
        heard: matchResult.word,
        score: matchResult.score,
        isIgnored,
        isPartial: true
      });
      if (matchResult.index !== -1) {
        usedHearings.add(matchResult.index);
      }
    } else {
      // No good match found
      if (!isIgnored) {
        mistakes.push({ 
          word: expectedWord, 
          spoken: matchResult.word || null, 
          confidence: matchResult.score,
          type: matchResult.word ? 'possible_mistake' : 'missing_word'
        });
      }
      // For ignored words with no match, just skip (don't count as mistake)
    }
  }
  
  // Calculate weighted accuracy
  let totalWeight = 0;
  let matchedWeight = 0;
  
  for (const match of matches) {
    const weight = match.isIgnored ? 0.3 : (IMPORTANT_WORDS.has(match.expected.toLowerCase()) ? 1.5 : 1.0);
    totalWeight += weight;
    
    if (match.score >= 0.8 || (match.isIgnored && match.score >= 0.6)) {
      matchedWeight += weight; // Full credit for good matches
    } else if (match.score >= 0.5) {
      matchedWeight += weight * 0.7; // Partial credit for partial matches
    }
  }
  
  // Add weight for unmatched important words (penalize more)
  for (const mistake of mistakes) {
    const weight = IMPORTANT_WORDS.has(mistake.word.toLowerCase()) ? 1.5 : 1.0;
    totalWeight += weight;
  }
  
  const weightedAccuracy = totalWeight > 0 ? (matchedWeight / totalWeight) * 100 : 0;
  
  // Calculate traditional accuracy for comparison
  const traditionalMatched = matches.filter(m => m.score >= 0.8 || (m.isIgnored && m.score >= 0.6)).length;
  const traditionalAccuracy = expectedWords.length > 0 ? (traditionalMatched / expectedWords.length) * 100 : 0;
  
  // Use the better of weighted or traditional accuracy
  const accuracy = Math.max(weightedAccuracy, traditionalAccuracy);
  
  // Calculate other metrics
  const wordsPerMinute = durationSeconds > 0 ? Math.round((matches.length / durationSeconds) * 60) : 0;
  const punctuationMarks = (storyText.match(/[?!.,]/g) || []).length;
  const pauseDensity = punctuationMarks > 0 ? Math.min(100, Math.round((durationSeconds / punctuationMarks) * 10)) : 70;
  
  // Improved fluency calculation - less dependent on perfect accuracy
  const fluency = Math.max(40, Math.min(100, Math.round(
    (accuracy * 0.5) + 
    (recognitionConfidence * 40) + 
    (Math.min(wordsPerMinute, 100) * 0.1)
  )));
  
  const expression = Math.max(45, Math.min(100, Math.round(
    (pauseDensity * 0.4) + 
    (accuracy * 0.4) + 
    20
  )));
  
  const speed = Math.max(50, Math.min(100, Math.round((wordsPerMinute / 2.2) * 10)));
  const improvement = Math.max(0, Math.min(100, Math.round((accuracy - previousBest) + 50)));
  
  // More forgiving scoring formula for children
  const scoreRaw = (
    (accuracy * 0.20) +          // Accuracy is important but not everything
    (fluency * 0.30) +           // Fluency matters most for young readers
    (speed * 0.10) +             // Speed is least important for beginners
    (pauseDensity * 0.15) +      // Good pacing shows understanding
    (expression * 0.15) +        // Expression shows engagement
    (improvement * 0.10)         // Improvement shows progress
  ) / 10;

  const numericScore = Math.max(1, Math.min(10, Number(scoreRaw.toFixed(1))));
  
  
  // Convert to child-friendly star rating (1-5 stars with half stars)
  const starRating = Math.min(5, Math.max(1, Math.round(numericScore / 2)));
  const hasHalfStar = (numericScore % 2) >= 1;
  
  // Visual star display
  const starDisplay = '⭐'.repeat(starRating) + (hasHalfStar ? '✨' : '');
  
  // Emoji-based scoring categories
  let emojiScore;
  let category;
  
  if (numericScore >= 9) {
    emojiScore = '🌟🎉✨'; // Super star!
    category = 'Reading Rockstar!';
  } else if (numericScore >= 8) {
    emojiScore = '🎉😊👍'; // Excellent!
    category = 'Excellent Reader!';
  } else if (numericScore >= 7) {
    emojiScore = '😊👍👏'; // Great job!
    category = 'Great Job!';
  } else if (numericScore >= 6) {
    emojiScore = '👍👏💪'; // Good work!
    category = 'Good Work!';
  } else if (numericScore >= 5) {
    emojiScore = '👏💪📚'; // Keep going!
    category = 'Keep Practicing!';
  } else {
    emojiScore = '💪📚🌱'; // You're learning!
    category = 'You\'re Learning!';
  }

  // More encouraging messages for children
  const message = numericScore >= 8.5
    ? '🌟 Amazing reading! You read with great expression and confidence!'
    : numericScore >= 7
      ? '🎉 Wonderful job! Your reading is getting better every time!'
      : numericScore >= 5.5
        ? '👍 Good work! You finished the story and practiced your reading!'
        : '💪 You completed the story! Every time you read, you get better!';

  return {
    score: numericScore,
    starRating: starDisplay, // Visual stars
    emojiScore: emojiScore,  // Fun emojis
    category: category,      // Simple category
    accuracy: Math.round(accuracy),
    fluency,
    speed: wordsPerMinute,
    punctuation: pauseDensity,
    expression,
    improvement,
    wordsPerMinute,
    durationSeconds,
    mistakes: mistakes.slice(0, 10), // Limit to top 10 mistakes
    recognitionConfidence,
    childMessage: message,
    // Add some debug info
    _debug: {
      expectedWordCount: expectedWords.length,
      heardWordCount: heardWords.length,
      matchesCount: matches.length,
      mistakesCount: mistakes.length,
      weightedAccuracy: Math.round(weightedAccuracy),
      traditionalAccuracy: Math.round(traditionalAccuracy)
    }
  };
}

export function mergeDifficultWords(existingMap = {}, mistakes = []) {
  const next = { ...existingMap };
  mistakes.forEach((item) => {
    if (!item.word) return;
    const key = item.word.toLowerCase();
    const curr = next[key] || { word: key, attempts: 0, correct: 0, missed: 0, confidence: 0.7 };
    curr.attempts += 1;
    
    // Updated for new mistake structure
    if (item.confidence < 0.3) {
      curr.missed += 1;
    } else if (item.confidence < 0.6) {
      curr.confidence = Number(((curr.confidence + 0.5) / 2).toFixed(2));
    } else {
      curr.correct += 1;
    }
    
    next[key] = curr;
  });
  return next;
}
// Comprehension Scoring Functions
export function calculateComprehensionScore(answers, questions) {
  if (!questions || !Array.isArray(questions) || questions.length === 0) {
    return {
      score: 0,
      total: 0,
      percentage: 0,
      breakdown: {
        literal: 0,
        inferential: 0,
        vocabulary: 0
      }
    };
  }

  const correctCount = answers.filter(answer => 
    answer.isCorrect !== undefined ? answer.isCorrect : 
    (answer.selectedOption !== undefined && 
     answer.selectedOption === questions[answer.questionIndex]?.correctAnswer)
  ).length;

  const percentage = Math.round((correctCount / questions.length) * 100);
  
  return {
    score: correctCount,
    total: questions.length,
    percentage,
    breakdown: calculateComprehensionBreakdown(answers, questions)
  };
}

function calculateComprehensionBreakdown(answers, questions) {
  const types = ['literal', 'inferential', 'vocabulary'];
  const breakdown = {};
  
  types.forEach(type => {
    const typeQuestions = questions.filter(q => q.type === type);
    if (typeQuestions.length === 0) {
      breakdown[type] = 0;
      return;
    }
    
    const typeAnswers = answers.filter(a => {
      const question = questions[a.questionIndex];
      return question && question.type === type;
    });
    
    const correct = typeAnswers.filter(a => 
      a.isCorrect !== undefined ? a.isCorrect : 
      (a.selectedOption !== undefined && 
       a.selectedOption === questions[a.questionIndex]?.correctAnswer)
    ).length;
    
    breakdown[type] = typeQuestions.length > 0 
      ? Math.round((correct / typeQuestions.length) * 100)
      : 0;
  });
  
  return breakdown;
}

export function createDefaultComprehensionQuestions() {
  return [
    {
      type: 'literal',
      question: 'What was the main character\'s goal?',
      options: ['To find a friend', 'To solve a mystery', 'To learn a lesson', 'To have an adventure'],
      correctAnswer: 3,
      explanation: 'The story was about having an adventure.'
    }
  ];
}

export function validateComprehensionQuestions(questions) {
  if (!Array.isArray(questions) || questions.length === 0) {
    return createDefaultComprehensionQuestions();
  }
  
  return questions.filter(q => 
    q && 
    typeof q.question === 'string' &&
    Array.isArray(q.options) && q.options.length === 4 &&
    typeof q.correctAnswer === 'number' && q.correctAnswer >= 0 && q.correctAnswer < 4
  );
}
