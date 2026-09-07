'use client';

import { useMemo, useRef, useState } from 'react';
import { analyzeReading, mergeDifficultWords } from '@/lib/readingAnalysis';
import { storyTextFromPages } from '@/lib/storyUtils';
import { createSpeechService } from '@/lib/speech/factory';

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
  const [currentPage, setCurrentPage] = useState(0);
  const [reading, setReading] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [result, setResult] = useState(null);
  const [liveHint, setLiveHint] = useState('');
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
        <div className="completion-card">
          <h3>🎉 Story Complete!</h3>
          <p>⭐ {result.score}/10</p>
          <p>⏱️ You read the whole story in {formatTime(result.durationSeconds)}!</p>
          <p>🌟 {result.childMessage}</p>
          <div className="completion-actions">
            <button onClick={onClose}>📖 Read another adventure</button>
            <button className="secondary-btn" onClick={onClose}>🚀 Continue tomorrow</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
