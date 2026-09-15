'use client';

import { useState } from 'react';
import { createSpeechService } from '@/lib/speech/factory';

export default function AppSpeechTest() {
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [confidence, setConfidence] = useState(null);
  const [error, setError] = useState('');
  const [speechService, setSpeechService] = useState(null);

  const startTest = async () => {
    setError('');
    setTranscript('');
    setConfidence(null);

    try {
      // Use 'browser-live' engine (same as your app default now)
      const service = createSpeechService('browser-live');
      setSpeechService(service);
      
      await service.startRecording();
      setRecording(true);
    } catch (err) {
      setError(`Failed to start: ${err.message}`);
    }
  };

  const stopTest = async () => {
    if (!speechService) return;

    try {
      const result = await speechService.stopRecording();
      setTranscript(result.transcript);
      setConfidence(result.confidence);
      setRecording(false);
    } catch (err) {
      setError(`Error stopping: ${err.message}`);
    } finally {
      setRecording(false);
    }
  };

  const testTranscribe = async () => {
    if (!speechService) return;

    try {
      const result = await speechService.transcribe();
      setTranscript(result.transcript);
      setConfidence(result.confidence);
    } catch (err) {
      setError(`Transcribe error: ${err.message}`);
    }
  };

  const testText = "Once upon a time in a magical forest";

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>App Speech Service Test</h1>
      <p>Testing the actual speech service your app uses (browser-live engine)</p>

      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#e9ecef', borderRadius: '5px' }}>
        <h3>Test Instructions:</h3>
        <p>1. Click "Start Test" (allow microphone permissions)</p>
        <p>2. Speak clearly:</p>
        <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#0c5460' }}>"{testText}"</p>
        <p>3. Click "Stop & Get Results"</p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        {!recording ? (
          <button 
            onClick={startTest}
            style={{
              padding: '10px 20px',
              fontSize: '16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              marginRight: '10px'
            }}
          >
            Start Test
          </button>
        ) : (
          <button 
            onClick={stopTest}
            style={{
              padding: '10px 20px',
              fontSize: '16px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              marginRight: '10px'
            }}
          >
            Stop & Get Results
          </button>
        )}
        
        <button 
          onClick={testTranscribe}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Just Transcribe
        </button>
      </div>

      {recording && (
        <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#d4edda', borderRadius: '5px' }}>
          <p style={{ color: '#155724' }}>🎤 Recording... Speak now</p>
        </div>
      )}

      {error && (
        <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '5px' }}>
          <h4>Error:</h4>
          <p>{error}</p>
        </div>
      )}

      <div style={{ marginTop: '20px' }}>
        <h3>Results:</h3>
        
        <div style={{ marginBottom: '15px' }}>
          <p><strong>Transcript:</strong></p>
          <div style={{ 
            minHeight: '60px', 
            padding: '15px', 
            backgroundColor: '#f8f9fa', 
            border: '1px solid #dee2e6',
            borderRadius: '5px',
            fontSize: '16px'
          }}>
            {transcript || 'No transcript yet'}
          </div>
        </div>

        {confidence !== null && (
          <div>
            <p><strong>Confidence:</strong> {confidence.toFixed(2)}</p>
            <div style={{ 
              width: '100%', 
              height: '20px', 
              backgroundColor: '#e9ecef', 
              borderRadius: '10px',
              overflow: 'hidden'
            }}>
              <div 
                style={{ 
                  width: `${confidence * 100}%`, 
                  height: '100%', 
                  backgroundColor: confidence > 0.7 ? '#28a745' : confidence > 0.4 ? '#ffc107' : '#dc3545'
                }}
              ></div>
            </div>
            <p style={{ fontSize: '14px', color: '#6c757d' }}>
              {confidence > 0.7 ? 'Good confidence' : 
               confidence > 0.4 ? 'Medium confidence' : 
               'Low confidence'}
            </p>
          </div>
        )}
      </div>

      <div style={{ marginTop: '30px', fontSize: '14px', color: '#6c757d' }}>
        <h4>About This Test:</h4>
        <ul>
          <li>Uses the <strong>exact same speech service</strong> as your app (browser-live)</li>
          <li>Uses your improved <code>BrowserSpeechRecognition.js</code> class</li>
          <li>Confidence calculation: Based on transcript length and quality</li>
          <li>Empty transcript → confidence ~0.4</li>
          <li>Good transcript → confidence 0.7-0.85</li>
        </ul>
      </div>
    </div>
  );
}