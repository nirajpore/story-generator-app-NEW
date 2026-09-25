'use client';

import { useMemo, useRef, useState, useEffect } from 'react';
import { analyzeReading, mergeDifficultWords, validateComprehensionQuestions } from '@/lib/readingAnalysis';
import { storyTextFromPages } from '@/lib/storyUtils';
import { createSpeechService } from '@/lib/speech/factory';
import { getStoryBackground } from '@/lib/backgroundUtils';
import ComprehensionPanel from './ComprehensionPanel';

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins} min ${secs.toString().padStart(2, '0')} sec`;
}

export default function BookReader({
  story,
  speechEngine,
  previousBestAccuracy,
  onClose,
  onComplete,
}) {
  console.log('BookReader story:', story);
  console.log('Comprehension questions:', story?.comprehensionQuestions);
  
  // Debug: Validate and log comprehension questions
  const validatedQuestions = validateComprehensionQuestions(story?.comprehensionQuestions);
  console.log('Validated questions count:', validatedQuestions.length);
  
  // For testing: Always show comprehension if we have at least 1 valid question
  const hasQuestions = validatedQuestions.length > 0;
  
  // Add/remove body class when comprehension modal opens/closes
  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (showComprehension) {
        document.body.classList.add('comprehension-modal-open');
      } else {
        document.body.classList.remove('comprehension-modal-open');
      }
    }
    
    return () => {
      if (typeof document !== 'undefined') {
        document.body.classList.remove('comprehension-modal-open');
      }
    };
  }, [showComprehension]);
  const [currentPage, setCurrentPage] = useState(0);
  const [reading, setReading] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [result, setResult] = useState(null);
  const [liveHint, setLiveHint] = useState('');
  const [showComprehension, setShowComprehension] = useState(false);
  const [comprehensionAnswers, setComprehensionAnswers] = useState([]);
  const [comprehensionScore, setComprehensionScore] = useState(null);
  const timerRef = useRef(null);
  const speechRef = useRef(null);
  const startX = useRef(0);

  const flattenedText = useMemo(() => storyTextFromPages(story.pages), [story.pages]);

  const startReading = async () => {
    setResult(null);
    setSeconds(0);
    setReading(true);
    timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    const speech = createSpeechService(speechEngine);
    speechRef.current = speech;
    try {
      await speech.startRecording();
      setLiveHint('🎤 Listening while you read...');
    } catch (error) {
      setLiveHint(`🎤 Recording fallback: ${error.message}`);
    }
  };

  const finishReading = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    const speechData = speechRef.current
      ? await speechRef.current.stopRecording().catch(() => ({ transcript: '', confidence: 0.45, processingTimeMs: 0 }))
      : { transcript: '', confidence: 0.45, processingTimeMs: 0 };
    setReading(false);

    const analysis = analyzeReading({
      storyText: flattenedText,
      transcript: speechData.transcript,
      durationSeconds: seconds,
      recognitionConfidence: speechData.confidence || 0.55,
      previousBest: previousBestAccuracy,
    });

    const difficultWords = mergeDifficultWords({}, analysis.mistakes);
    const completed = {
      ...analysis,
      transcript: speechData.transcript,
      processingTimeMs: speechData.processingTimeMs,
      storyId: story.id,
      storyTheme: story.theme,
      createdAt: new Date().toISOString(),
      difficultWords,
    };

    setResult(completed);
    onComplete(completed);
  };

  return (
    <div className="reader-shell">
      {/* Full-page background */}
      <div 
        className="full-page-background"
        style={{
          backgroundImage: `url(${getStoryBackground(story.theme, currentPage)})`,
        }}
      />
      
      <div className="reader-content">
        <div className="top-row">
          <button className="secondary-btn" onClick={onClose}>← Home</button>
          <h2>{story.title}</h2>
        </div>

        <div
          className="book-page"
          onTouchStart={(e) => { startX.current = e.changedTouches[0].clientX; }}
          onTouchEnd={(e) => {
            const delta = e.changedTouches[0].clientX - startX.current;
            if (delta > 40 && currentPage > 0) setCurrentPage(currentPage - 1);
            if (delta < -40 && currentPage < story.pages.length - 1) setCurrentPage(currentPage + 1);
          }}
        >
          <p className="page-number">Page {currentPage + 1} / {story.pages.length}</p>
          <p className="page-text">{story.pages[currentPage]?.text}</p>
        </div>

        <div className="reader-controls">
          <button disabled={currentPage === 0} onClick={() => setCurrentPage((p) => p - 1)}>Previous</button>
          <button disabled={currentPage >= story.pages.length - 1} onClick={() => setCurrentPage((p) => p + 1)}>Next</button>
        </div>

        <div className="reader-actions">
          {!reading ? (
            <button onClick={startReading}>START READING</button>
          ) : (
            <button onClick={finishReading}>FINISH STORY</button>
          )}
          {reading ? <p className="soft-timer">⏱️ Session time: {formatTime(seconds)}</p> : null}
          {liveHint ? <p>{liveHint}</p> : null}
        </div>

        {result ? (
          <>
            <div className="completion-card">
              <h3>🎉 Story Complete!</h3>
              {result.starRating ? (
                <p className="star-rating-large">{result.starRating}</p>
              ) : (
                <p>⭐ {result.score}/10</p>
              )}
              {result.category && <p className="category-badge">{result.category} {result.emojiScore}</p>}
              <p>⏱️ You read the whole story in {formatTime(result.durationSeconds)}!</p>
              <p className="encouraging-message">🌟 {result.childMessage}</p>
              <div className="score-details" style={{marginTop: '10px', padding: '10px', background: '#f8f9fa', borderRadius: '5px'}}>
                <p style={{margin: '5px 0'}}><strong>Accuracy:</strong> {result.accuracy}%</p>
                <p style={{margin: '5px 0'}}><strong>Words per minute:</strong> {result.wordsPerMinute}</p>
                <p style={{margin: '5px 0'}}><strong>Expression:</strong> {result.expression}/100</p>
              </div>
              <div className="completion-actions">
              {hasQuestions && !showComprehension && (
                <button onClick={() => setShowComprehension(true)} className="comprehension-start-btn">
                  📚 Check Your Understanding
                </button>
              )}
              <button onClick={onClose}>📖 Read another adventure</button>
              <button className="secondary-btn" onClick={onClose}>🚀 Continue tomorrow</button>
            </div>
            </div>
            
            {/* Debug info - shows what's being captured */}
            <div className="debug-info" style={{background: '#f0f0f0', padding: '15px', marginTop: '20px', borderRadius: '5px', fontSize: '12px'}}>
              <h4>📊 Debug Analysis:</h4>
              <p><strong>Transcript captured:</strong> &quot;{result.transcript.substring(0, 150)}...&quot;</p>
              <p><strong>Speech confidence:</strong> {result.recognitionConfidence}</p>
              <p><strong>Accuracy:</strong> {result.accuracy}%</p>
              <p><strong>Story word count:</strong> {flattenedText.split(' ').length} words</p>
              <p><strong>Matched words:</strong> {result._debug?.matchesCount || Math.round((result.accuracy/100) * (flattenedText.split(' ').length))}/{flattenedText.split(' ').length}</p>
              <p><strong>Mistakes detected:</strong> {result.mistakes?.length || 0}</p>
              {result._debug && (
                <div style={{marginTop: '10px', padding: '10px', backgroundColor: '#e9ecef', borderRadius: '5px'}}>
                  <p><strong>Debug Details:</strong></p>
                  <p>Expected: {result._debug.expectedWordCount} words | Heard: {result._debug.heardWordCount} words</p>
                  <p>Weighted accuracy: {result._debug.weightedAccuracy}% | Traditional: {result._debug.traditionalAccuracy}%</p>
                </div>
              )}
              {result.mistakes && result.mistakes.length > 0 && (
                <div>
                  <p><strong>Top mistakes:</strong></p>
                  <ul>
                    {result.mistakes.slice(0, 5).map((mistake, i) => (
                      <li key={i}>
                        &quot;{mistake.word}&quot; → &quot;{mistake.spoken || 'missing'}&quot; 
                        (confidence: {mistake.confidence?.toFixed(2) || 'N/A'})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </>
        ) : null}

        {/* Comprehension Modal/Overlay */}
        {showComprehension && hasQuestions && (
          <div className="comprehension-modal-overlay">
            <div className="comprehension-modal">
              <div className="comprehension-modal-header">
                <button 
                  className="comprehension-back-btn"
                  onClick={() => setShowComprehension(false)}
                >
                  ← Back to Results
                </button>
                <h2>📚 Story Check</h2>
                <div className="comprehension-modal-subtitle">
                  Let&apos;s see what you remember from the story!
                </div>
              </div>
              <ComprehensionPanel
                questions={validatedQuestions}
                onComplete={(comprehensionResult) => {
                  setComprehensionScore(comprehensionResult);
                  setShowComprehension(false);
                  // Store comprehension results with reading results
                  if (onComplete && result) {
                    onComplete({
                      ...result,
                      comprehension: comprehensionResult
                    });
                  }
                }}
                onSkip={() => setShowComprehension(false)}
              />
            </div>
          </div>
        )}

        {/* Show Comprehension Score */}
        {comprehensionScore && !showComprehension && (
          <div className="comprehension-score">
            <h4>📚 Comprehension Score</h4>
            <div className="comprehension-percentage">
              {comprehensionScore.percentage}%
            </div>
            <p>You got {comprehensionScore.score} out of {comprehensionScore.total} questions correct!</p>
            <div className="score-breakdown">
              <div className="breakdown-item">
                <div className="breakdown-label">Literal</div>
                <div className="breakdown-value literal">{comprehensionScore.breakdown?.literal || 0}%</div>
              </div>
              <div className="breakdown-item">
                <div className="breakdown-label">Inferential</div>
                <div className="breakdown-value inferential">{comprehensionScore.breakdown?.inferential || 0}%</div>
              </div>
              <div className="breakdown-item">
                <div className="breakdown-label">Vocabulary</div>
                <div className="breakdown-value vocabulary">{comprehensionScore.breakdown?.vocabulary || 0}%</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
