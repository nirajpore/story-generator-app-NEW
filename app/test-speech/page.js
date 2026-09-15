'use client';

import { useState, useEffect } from 'react';

export default function SpeechTestPage() {
  const [support, setSupport] = useState(null);
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const [recognition, setRecognition] = useState(null);

  useEffect(() => {
    // Check browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSupport('supported');
    } else {
      setSupport('unsupported');
    }
  }, []);

  const startRecording = () => {
    setError('');
    setTranscript('');
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Speech Recognition API not supported in this browser');
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';

    rec.onstart = () => {
      setRecording(true);
      console.log('Recording started');
    };

    rec.onresult = (event) => {
      let final = '';
      let interim = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      
      setTranscript(final + (interim ? ' (' + interim + ')' : ''));
    };

    rec.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setError(`Error: ${event.error}`);
      if (event.error === 'not-allowed') {
        setError('Microphone access denied. Please allow permissions.');
      }
    };

    rec.onend = () => {
      setRecording(false);
      console.log('Recording ended');
    };

    try {
      rec.start();
      setRecognition(rec);
    } catch (err) {
      setError(`Failed to start: ${err.message}`);
    }
  };

  const stopRecording = () => {
    if (recognition) {
      recognition.stop();
      setRecognition(null);
    }
  };

  const testPhrase = "The quick brown fox jumps over the lazy dog";

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Speech Recognition Test</h1>
      
      <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: support === 'supported' ? '#d4edda' : '#f8d7da', borderRadius: '5px' }}>
        <h3>Browser Support:</h3>
        {support === 'supported' ? (
          <p style={{ color: '#155724' }}>✅ Speech Recognition API is supported!</p>
        ) : support === 'unsupported' ? (
          <p style={{ color: '#721c24' }}>❌ Speech Recognition API is NOT supported. Try Chrome, Edge, or Safari.</p>
        ) : (
          <p>Checking...</p>
        )}
      </div>

      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#e9ecef', borderRadius: '5px' }}>
        <h3>Test Instructions:</h3>
        <p>Click "Start Recording", then speak clearly:</p>
        <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#0c5460' }}>"{testPhrase}"</p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        {!recording ? (
          <button 
            onClick={startRecording}
            style={{
              padding: '10px 20px',
              fontSize: '16px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Start Recording
          </button>
        ) : (
          <button 
            onClick={stopRecording}
            style={{
              padding: '10px 20px',
              fontSize: '16px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Stop Recording
          </button>
        )}
        
        {recording && (
          <span style={{ marginLeft: '20px', color: '#856404', fontSize: '14px' }}>
            🎤 Recording... Speak now
          </span>
        )}
      </div>

      {error && (
        <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '5px' }}>
          <h4>Error:</h4>
          <p>{error}</p>
        </div>
      )}

      <div style={{ marginTop: '20px' }}>
        <h3>Live Transcript:</h3>
        <div style={{ 
          minHeight: '100px', 
          padding: '15px', 
          backgroundColor: '#f8f9fa', 
          border: '1px solid #dee2e6',
          borderRadius: '5px',
          fontSize: '16px'
        }}>
          {transcript || 'Nothing recorded yet...'}
        </div>
      </div>

      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#d1ecf1', borderRadius: '5px' }}>
        <h3>Expected Result:</h3>
        <p>If speech recognition is working, you should see something like:</p>
        <p style={{ fontFamily: 'monospace', backgroundColor: '#ffffff', padding: '10px', borderRadius: '3px' }}>
          The quick brown fox jumps over the lazy dog
        </p>
        <p>Or a close variation like "the quick brown fox jumps over lazy dog"</p>
      </div>

      <div style={{ marginTop: '30px', fontSize: '14px', color: '#6c757d' }}>
        <h4>Browser Notes:</h4>
        <ul>
          <li><strong>Chrome/Edge:</strong> Uses Google's speech recognition (accurate)</li>
          <li><strong>Safari:</strong> Uses Apple's speech recognition (good on Apple devices)</li>
          <li><strong>Firefox:</strong> Does NOT support Speech Recognition API</li>
        </ul>
      </div>
    </div>
  );
}