'use client';

import { useState } from 'react';
import { createSpeechService } from '@/lib/speech/factory';

export default function SpeechTestPanel({ engine }) {
  const [expectedText, setExpectedText] = useState('The bright sun was shining over the happy forest.');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [service, setService] = useState(null);

  const start = async () => {
    setError('');
    setResult(null);
    try {
      const speech = createSpeechService(engine);
      setService(speech);
      await speech.startRecording();
      setRunning(true);
    } catch (e) {
      setError(e.message);
    }
  };

  const stop = async () => {
    if (!service) return;
    try {
      const data = await service.stopRecording();
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="speech-test">
      <p>Speech test page: record, transcribe, compare expected text, and review timing/confidence.</p>
      <textarea
        value={expectedText}
        onChange={(e) => setExpectedText(e.target.value)}
        rows={3}
      />
      <div className="speech-actions">
        {!running ? <button onClick={start}>Start Test Recording</button> : <button onClick={stop}>Finish Test Recording</button>}
      </div>
      {error ? <p className="error">{error}</p> : null}
      {result ? (
        <div className="speech-result">
          <p><strong>Expected text:</strong> {expectedText}</p>
          <p><strong>Transcription:</strong> {result.transcript || '(no transcript)'}</p>
          <p><strong>Processing time:</strong> {Math.round((result.processingTimeMs || 0) / 1000)}s</p>
          <p><strong>Recognition confidence:</strong> {result.confidence ?? 'n/a'}</p>
        </div>
      ) : null}
    </div>
  );
}
