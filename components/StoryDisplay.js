'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { alignTranscription } from '@/lib/reading/alignment';
import { scoreReading } from '@/lib/reading/scoring';
import { normalizeTextForDisplay } from '@/lib/reading/normalization';

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function childFeedback(overall, accuracyScore) {
  if (overall >= 8.8) return '🌟 Amazing reading! You were super clear today!';
  if (overall >= 7.5) return '⭐ Great job! You read almost the whole adventure smoothly!';
  if (accuracyScore >= 8) return '👏 Nice effort! You got most words right!';
  return '💪 Keep going! Every story makes you stronger!';
}

export default function StoryDisplay({ story, onBack, onDelete, onStoryUpdate }) {
  const [copied, setCopied] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [readingTime, setReadingTime] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [manualTranscript, setManualTranscript] = useState('');
  const [showParentDebug, setShowParentDebug] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [transcriptionProvider, setTranscriptionProvider] = useState('gemini_server');
  const [browserSpeechSupported, setBrowserSpeechSupported] = useState(false);
  const [transcriptionConfidence, setTranscriptionConfidence] = useState(0);
  const [transcriptionModelUsed, setTranscriptionModelUsed] = useState('gemini-3.5-transcribe (server)');
  const [wordTimings, setWordTimings] = useState([]);
  const [debugEvents, setDebugEvents] = useState([]);
  const [pageIndex, setPageIndex] = useState(0);

  const timerRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const readingDurationRef = useRef(0);
  const recognitionRef = useRef(null);
  const confidenceSamplesRef = useRef([]);
  const confidenceRef = useRef(0);
  const transcriptRef = useRef('');
  const browserFinishPendingRef = useRef(false);
  const runAnalysisRef = useRef(null);

  const pages = story.pages?.length ? story.pages : [story.content];

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  useEffect(() => {
    const savedProvider = window.localStorage.getItem('debug_transcription_provider');
    if (savedProvider === 'browser_web_speech' || savedProvider === 'gemini_server') {
      setTranscriptionProvider(savedProvider);
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setBrowserSpeechSupported(true);
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';
        const confidenceSamples = [];

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const chunk = result[0].transcript || '';
          if (result.isFinal) {
            finalTranscript += `${chunk} `;
            if (typeof result[0].confidence === 'number' && result[0].confidence > 0) {
              confidenceSamples.push(result[0].confidence);
            }
          } else {
            interimTranscript += chunk;
          }
        }

        if (confidenceSamples.length) {
          confidenceSamplesRef.current.push(...confidenceSamples);
          const average = confidenceSamplesRef.current.reduce((a, b) => a + b, 0) / confidenceSamplesRef.current.length;
          const rounded = Number(average.toFixed(2));
          confidenceRef.current = rounded;
          setTranscriptionConfidence(rounded);
        }

        if (finalTranscript || interimTranscript) {
          setTranscript((prev) => {
            const next = `${prev} ${finalTranscript}${interimTranscript}`.trim();
            transcriptRef.current = next;
            return next;
          });
        }
      };
      recognitionRef.current.onerror = (event) => {
        setDebugEvents((prev) => [`Browser speech error: ${event.error}`, ...prev].slice(0, 20));
      };
      recognitionRef.current.onend = () => {
        if (browserFinishPendingRef.current) {
          browserFinishPendingRef.current = false;
          runAnalysisRef.current?.(transcriptRef.current, readingDurationRef.current, {
            confidence: confidenceRef.current,
            model: 'browser-web-speech',
            words: [],
          });
        }
      };
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem('debug_transcription_provider', transcriptionProvider);
  }, [transcriptionProvider]);

  const parentAnalysis = useMemo(() => {
    if (!analysis?.score?.canScore) return null;
    const score = analysis.score;
    return {
      overall: score.overall,
      breakdown: [
        ['Accuracy', score.accuracy.score],
        ['Fluency', score.fluency.score],
        ['Speed', score.speed.score],
        ['Punctuation', score.punctuation.score],
        ['Expression', score.expression.score],
      ],
    };
  }, [analysis]);

  const runAnalysis = (inputTranscript, durationSeconds, transcriptionMeta = {}) => {
    const cleanExpected = normalizeTextForDisplay(story.content || '');
    const cleanHeard = normalizeTextForDisplay(inputTranscript || '');

    const alignment = alignTranscription(cleanExpected, cleanHeard, {
      uncertainThreshold: 0.84,
    });
    const confidenceForScore = typeof transcriptionMeta.confidence === 'number'
      ? transcriptionMeta.confidence
      : transcriptionConfidence;
    const score = scoreReading({
      alignment,
      durationSeconds,
      transcriptionConfidence: confidenceForScore,
      priorWpm: story?.latestReadingWpm || 125,
    });

    const result = {
      expectedText: cleanExpected,
      transcript: cleanHeard,
      alignment,
      score,
      durationSeconds,
      transcriptionProvider,
      transcriptionModel: transcriptionMeta.model || transcriptionModelUsed,
      transcriptionWords: transcriptionMeta.words || [],
      scoringWeights: {
        accuracy: 0.5,
        fluency: 0.2,
        speed: 0.1,
        punctuation: 0.1,
        expression: 0.1,
      },
      confidence: {
        transcription: confidenceForScore,
      },
    };
    runAnalysisRef.current = runAnalysis;
    setAnalysis(result);

    if (score.canScore && onStoryUpdate) {
      const updatedStory = {
        ...story,
        readingAnalysis: result,
        latestReadingOverall: score.overall,
        latestReadingWpm: score.speed.evidence.wordsPerMinute,
      };
      onStoryUpdate(updatedStory);
    } else if (!score.canScore && onStoryUpdate) {
      onStoryUpdate({
        ...story,
        readingAnalysis: result,
      });
    }
  };

  const transcribeServerAudio = async (audioBlob, durationSeconds) => {
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, `reading-${Date.now()}.webm`);
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || result?.details || 'Transcription failed');
      }

      const transcriptText = result.transcript || '';
      const confidence = typeof result.confidence === 'number' ? result.confidence : 0.7;
      const model = result.model || 'gemini-3.5-transcribe';
      const words = Array.isArray(result.words) ? result.words : [];

      setTranscript(transcriptText);
      setTranscriptionConfidence(confidence);
      setTranscriptionModelUsed(model);
      setWordTimings(words);
      runAnalysis(transcriptText, durationSeconds, { confidence, model, words });
    } catch (error) {
      setDebugEvents((prev) => [`Transcription error: ${error.message}`, ...prev].slice(0, 20));
      setTranscript('');
      setTranscriptionConfidence(0);
      runAnalysis('', durationSeconds, {
        confidence: 0,
        model: 'gemini-3.5-transcribe',
        words: [],
      });
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleStartReading = async () => {
    setIsReading(true);
    setIsTranscribing(false);
    setReadingTime(0);
    setTranscript('');
    setAnalysis(null);
    setDebugEvents([]);
    setWordTimings([]);
    setTranscriptionConfidence(0);
    setTranscriptionModelUsed(transcriptionProvider === 'gemini_server' ? 'gemini-3.5-transcribe (server)' : 'browser-web-speech');
    readingDurationRef.current = 0;
    confidenceSamplesRef.current = [];
    confidenceRef.current = 0;
    transcriptRef.current = '';
    browserFinishPendingRef.current = false;

    timerRef.current = setInterval(() => setReadingTime((prev) => prev + 1), 1000);
    if (transcriptionProvider === 'browser_web_speech') {
      if (!recognitionRef.current) {
        if (timerRef.current) clearInterval(timerRef.current);
        setIsReading(false);
        setDebugEvents((prev) => ['Browser speech recognition is not supported on this device.', ...prev].slice(0, 20));
        runAnalysis('', 0, {
          confidence: 0,
          model: 'browser-web-speech',
          words: [],
        });
        return;
      }

      try {
        recognitionRef.current.start();
        setDebugEvents((prev) => ['Recording started with browser speech fallback path', ...prev].slice(0, 20));
      } catch (error) {
        if (timerRef.current) clearInterval(timerRef.current);
        setIsReading(false);
        setDebugEvents((prev) => [`Browser speech start failed: ${error.message}`, ...prev].slice(0, 20));
      }
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = (event) => {
        const message = event?.error?.message || 'Recorder error';
        setDebugEvents((prev) => [`Recorder error: ${message}`, ...prev].slice(0, 20));
      };

      recorder.onstop = async () => {
        const mimeType = recorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const durationSeconds = readingDurationRef.current;
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((track) => track.stop());
          mediaStreamRef.current = null;
        }
        await transcribeServerAudio(audioBlob, durationSeconds);
      };

      recorder.start(250);
      setDebugEvents((prev) => ['Recording started with server-side transcription path', ...prev].slice(0, 20));
    } catch (error) {
      if (timerRef.current) clearInterval(timerRef.current);
      setIsReading(false);
      setDebugEvents((prev) => [`Microphone access failed: ${error.message}`, ...prev].slice(0, 20));
      runAnalysis('', 0, {
        confidence: 0,
        model: 'gemini-3.5-transcribe',
        words: [],
      });
    }
  };

  const handleFinishReading = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    readingDurationRef.current = readingTime;
    setIsReading(false);
    if (transcriptionProvider === 'browser_web_speech') {
      if (recognitionRef.current) {
        browserFinishPendingRef.current = true;
        recognitionRef.current.stop();
      } else {
        runAnalysis(transcriptRef.current, readingTime, {
          confidence: confidenceRef.current,
          model: 'browser-web-speech',
          words: [],
        });
      }
      return;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    } else {
      runAnalysis('', readingTime, {
        confidence: 0,
        model: 'gemini-3.5-transcribe',
        words: [],
      });
    }
  };

  const handleManualAnalysis = () => {
    if (!manualTranscript.trim()) return;
    const estimatedDuration = Math.max(10, Math.round((manualTranscript.split(/\s+/).length / 140) * 60));
    runAnalysis(manualTranscript, estimatedDuration, {
      confidence: 1,
      model: 'manual-parent-debug-input',
      words: [],
    });
  };

  const handleShare = () => {
    const storyUrl = `${window.location.origin}?storyId=${story.id}`;
    navigator.clipboard.writeText(storyUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const formattedDate = new Date(story.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const score = analysis?.score;

  return (
    <div>
      <button onClick={onBack} style={{ marginBottom: '20px' }}>← Back to Stories</button>

      <div className="story-container">
        <h2>{story.title}</h2>
        <div className="story-meta" style={{ marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px solid #eee' }}>
          <p><strong>Level:</strong> <span style={{ color: '#667eea', textTransform: 'capitalize' }}>{story.rwLevel || 'blue'}</span></p>
          <p><strong>Date:</strong> {formattedDate}</p>
          <p><strong>Word Count:</strong> {story.wordCount || 0}</p>
          {story.characterName && <p><strong>Theme:</strong> {story.characterName}</p>}
          {story.setting && <p><strong>Setting:</strong> {story.setting}</p>}
        </div>

        <div style={{ marginBottom: '14px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {pages.map((_, idx) => (
            <button
              key={`${story.id}-page-${idx}`}
              onClick={() => setPageIndex(idx)}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #ddd',
                background: pageIndex === idx ? '#667eea' : 'white',
                color: pageIndex === idx ? 'white' : '#333',
              }}
            >
              Page {idx + 1}
            </button>
          ))}
        </div>

        <div className="story-content" style={{ marginBottom: '24px', lineHeight: '1.8', fontSize: '18px', whiteSpace: 'pre-wrap' }}>
          {pages[pageIndex]}
        </div>

        {!isReading && (
          <button
            onClick={handleStartReading}
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              padding: '12px 30px',
              fontSize: '16px',
              marginBottom: '20px',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
            }}
          >
            🎤 Start Reading Practice
          </button>
        )}

        {isReading && (
          <div style={{ background: '#f0f4ff', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#667eea', marginBottom: '8px' }}>
              ⏱️ {formatTime(readingTime)}
            </div>
            <div style={{ fontSize: '14px', color: '#555', marginBottom: '10px' }}>
              <strong>Provider:</strong>{' '}
              <em>
                {transcriptionProvider === 'gemini_server'
                  ? 'Gemini server transcription (audio upload)'
                  : 'Browser speech fallback'}
              </em>
            </div>
            {transcriptionProvider === 'browser_web_speech' && (
              <div style={{ fontSize: '14px', color: '#555', marginBottom: '10px' }}>
                <strong>Live transcript:</strong> <em>{transcript || 'Listening...'}</em>
              </div>
            )}
            <div style={{ fontSize: '14px', color: '#555', marginBottom: '10px' }}>
              <strong>Recording:</strong> <em>Capturing reading audio...</em>
            </div>
            <button
              onClick={handleFinishReading}
              style={{
                background: 'linear-gradient(135deg, #f5576c 0%, #f093fb 100%)',
                padding: '12px 30px',
                fontSize: '16px',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
              }}
            >
              ✓ Finish Reading
            </button>
          </div>
        )}

        {isTranscribing && (
          <div style={{ background: '#fffaf0', padding: '14px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #f6ad55' }}>
            <strong>Transcribing audio on server with Gemini…</strong>
          </div>
        )}

        {analysis && (
          <div style={{ background: '#f0fff4', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '2px solid #48bb78' }}>
            {score?.canScore ? (
              <>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2f855a', marginBottom: '10px' }}>
                  🌟 {Math.round(score.overall)} / 10
                </div>
                <p style={{ marginBottom: '12px' }}>{childFeedback(score.overall, score.accuracy.score)}</p>
              </>
            ) : (
              <>
                <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#975a16', marginBottom: '10px' }}>
                  🎤 We couldn’t hear the reading clearly enough to score this one.
                </div>
                <p style={{ marginBottom: '12px' }}>Try again in a quieter room and keep the microphone close.</p>
              </>
            )}

            <button
              onClick={() => {
                setAnalysis(null);
                setTranscript('');
                setReadingTime(0);
              }}
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                padding: '10px 20px',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
              }}
            >
              Try Again
            </button>
          </div>
        )}

        <div style={{ marginBottom: '20px', padding: '14px', border: '1px solid #ddd', borderRadius: '8px', background: '#fafafa' }}>
          <h3 style={{ marginTop: 0 }}>Parent Test Mode (Reading Analysis)</h3>
          <p style={{ marginBottom: '8px', color: '#666' }}>Paste recognised speech to debug score evidence.</p>
          <textarea
            value={manualTranscript}
            onChange={(e) => setManualTranscript(e.target.value)}
            rows={4}
            style={{ width: '100%', padding: '8px', marginBottom: '8px' }}
            placeholder="Paste transcript here to run analysis..."
          />
          <button onClick={handleManualAnalysis}>Run Analysis</button>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <button onClick={() => setShowParentDebug((prev) => !prev)}>
            {showParentDebug ? 'Hide Parent/Developer Debug' : 'Show Parent/Developer Debug'}
          </button>
        </div>

        {showParentDebug && (
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px', background: '#fff' }}>
            <h3>Story & Research Debug</h3>
            <div style={{ marginBottom: '12px', padding: '10px', border: '1px solid #ddd', borderRadius: '8px', background: '#fafafa' }}>
              <label htmlFor="transcription-provider-select"><strong>Transcription provider (A/B testing): </strong></label>{' '}
              <select
                id="transcription-provider-select"
                value={transcriptionProvider}
                onChange={(e) => setTranscriptionProvider(e.target.value)}
                disabled={isReading || isTranscribing}
              >
                <option value="gemini_server">Gemini server (primary)</option>
                <option value="browser_web_speech" disabled={!browserSpeechSupported}>
                  Browser speech fallback {browserSpeechSupported ? '' : '(not supported on this browser)'}
                </option>
              </select>
            </div>
            <p><strong>Story word count:</strong> {story.wordCount}</p>
            <p><strong>Story quality score:</strong> {story.qualityValidation?.qualityScore ?? 'N/A'}</p>
            <p><strong>Research completed:</strong> {story.research?.completed ? 'YES' : 'NO'}</p>
            <p><strong>AI model used:</strong> {story.debug?.model || 'N/A'}</p>
            <p><strong>Research summary:</strong> {story.research?.summary || 'N/A'}</p>
            <div>
              <strong>Research sources:</strong>
              <ul>
                {(story.research?.sources || []).map((source, idx) => (
                  <li key={`${source.url}-${idx}`}>
                    <a href={source.url} target="_blank" rel="noreferrer">{source.title || source.url}</a>
                  </li>
                ))}
              </ul>
            </div>

            {parentAnalysis && (
              <>
                <h3>Reading Analysis</h3>
                <p><strong>Overall:</strong> {parentAnalysis.overall} / 10</p>
                {parentAnalysis.breakdown.map(([name, value]) => (
                  <p key={name}><strong>{name}:</strong> {value}</p>
                ))}
                <p>
                  You read {Math.round(((analysis.score?.accuracy?.evidence?.wordsMatched || 0) / Math.max(1, analysis.score?.accuracy?.evidence?.wordsExpected || 1)) * 100)}% of words correctly.
                </p>
                <p>
                  Duration: {formatTime(analysis.durationSeconds)} · WPM: {analysis.score?.speed?.evidence?.wordsPerMinute}
                </p>
              </>
            )}

            {analysis && (
              <>
                <p><strong>Transcription model:</strong> {analysis.transcriptionModel}</p>
                <p><strong>Transcription provider used:</strong> {analysis.transcriptionProvider}</p>
                <p><strong>Transcription confidence:</strong> {Math.round((analysis.confidence?.transcription || 0) * 100)}%</p>
                <p><strong>Word timestamps returned:</strong> {analysis.transcriptionWords?.length || wordTimings.length || 0}</p>
                <p><strong>Transcript:</strong> {analysis.transcript || '(empty)'}</p>
                <p><strong>Expected text:</strong> {analysis.expectedText.slice(0, 500)}{analysis.expectedText.length > 500 ? '…' : ''}</p>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '6px' }}>Expected</th>
                        <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '6px' }}>Heard</th>
                        <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '6px' }}>Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysis.alignment.rows.slice(0, 250).map((row, idx) => (
                        <tr key={`row-${idx}`}>
                          <td style={{ borderBottom: '1px solid #eee', padding: '6px' }}>{row.expected || '—'}</td>
                          <td style={{ borderBottom: '1px solid #eee', padding: '6px' }}>{row.heard || '—'}</td>
                          <td style={{ borderBottom: '1px solid #eee', padding: '6px' }}>
                            {row.result === 'possible_recognition_difference' ? 'Possible recognition difference' : row.result}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {story.debug?.storyAttempts?.length > 0 && (
              <>
                <h3>Story Validation Attempts</h3>
                <ul>
                  {story.debug.storyAttempts.map((attempt) => (
                    <li key={`attempt-${attempt.attempt}`}>
                      Attempt {attempt.attempt}: {attempt.wordCount} words, quality {attempt.qualityScore}, issues: {(attempt.issues || []).join('; ') || 'none'}
                    </li>
                  ))}
                </ul>
              </>
            )}

            {debugEvents.length > 0 && (
              <>
                <h3>Recognition Events</h3>
                <ul>
                  {debugEvents.map((item, idx) => <li key={`ev-${idx}`}>{item}</li>)}
                </ul>
              </>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '20px' }}>
          <button
            onClick={handleShare}
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              padding: '10px 20px',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
            }}
          >
            {copied ? '✓ Link Copied!' : '📤 Share Story'}
          </button>
          <button
            onClick={() => {
              if (confirm('Are you sure you want to delete this story?')) onDelete();
            }}
            style={{
              background: 'linear-gradient(135deg, #f5576c 0%, #f093fb 100%)',
              color: 'white',
              padding: '10px 20px',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
            }}
          >
            🗑️ Delete
          </button>
        </div>
      </div>
    </div>
  );
}
