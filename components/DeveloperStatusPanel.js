'use client';

import { APP_NAME, APP_VERSION, BUILD_ID, LAST_UPDATE_LABEL } from '@/lib/app/version';

function statusBadge(status) {
  if (status === 'WORKING') return '✓ WORKING';
  if (status === 'PARTIAL') return '⚠ PARTIAL';
  return '✕ NOT WORKING';
}

function statusColor(status) {
  if (status === 'WORKING') return '#2f855a';
  if (status === 'PARTIAL') return '#b7791f';
  return '#c53030';
}

function featureStatus(story) {
  const researchWorking = story?.research?.completed && (story?.research?.sources || []).length > 0;
  const quality = story?.qualityValidation;
  const validationWorking = quality?.coherent && quality?.sufficientLength;
  const pageWorking = (story?.pages || []).length >= 3 && (story?.pages || []).length <= 5;
  const reading = story?.readingAnalysis;
  const recordingWorking = !!reading?.durationSeconds && reading.durationSeconds > 0;
  const transcriptWorking = !!reading?.transcript;
  const alignmentWorking = (reading?.alignment?.rows || []).length > 0;
  const scoringWorking = reading?.score?.canScore === true;

  return {
    themeResearch: researchWorking ? 'WORKING' : story ? 'PARTIAL' : 'NOT_WORKING',
    storyGeneration: story?.content ? 'WORKING' : 'NOT_WORKING',
    storyValidation: validationWorking ? 'WORKING' : story ? 'PARTIAL' : 'NOT_WORKING',
    pageSplitting: pageWorking ? 'WORKING' : story ? 'PARTIAL' : 'NOT_WORKING',
    audioRecording: recordingWorking ? 'WORKING' : reading ? 'PARTIAL' : 'NOT_WORKING',
    transcription: transcriptWorking ? 'WORKING' : reading ? 'PARTIAL' : 'NOT_WORKING',
    wordAlignment: alignmentWorking ? 'WORKING' : reading ? 'PARTIAL' : 'NOT_WORKING',
    evidenceScoring: scoringWorking ? 'WORKING' : reading ? 'PARTIAL' : 'NOT_WORKING',
  };
}

function displayValue(value, fallback = 'N/A') {
  if (value === null || value === undefined || value === '') return fallback;
  return value;
}

export default function DeveloperStatusPanel({ latestStory, apiStatus }) {
  const statuses = featureStatus(latestStory);
  const reading = latestStory?.readingAnalysis;
  const score = reading?.score;

  const list = [
    ['Theme research', statuses.themeResearch],
    ['Story generation', statuses.storyGeneration],
    ['Story validation', statuses.storyValidation],
    ['Page splitting', statuses.pageSplitting],
    ['Audio recording', statuses.audioRecording],
    ['Transcription', statuses.transcription],
    ['Word alignment', statuses.wordAlignment],
    ['Evidence-based scoring', statuses.evidenceScoring],
  ];
  const implemented = list.filter(([, status]) => status === 'WORKING').map(([label]) => label);
  const unavailable = list.filter(([, status]) => status !== 'WORKING').map(([label]) => label);

  return (
    <div className="card" style={{ background: 'rgba(255,255,255,0.96)', marginBottom: '20px' }}>
      <h2 style={{ marginTop: 0 }}>Parent/Developer Development Status</h2>
      <p><strong>{APP_NAME} {APP_VERSION}</strong></p>
      <p><strong>Build:</strong> {BUILD_ID}</p>
      <p><strong>Last update:</strong> {LAST_UPDATE_LABEL}</p>

      <h3>Implementation Status</h3>
      <p><strong>Features implemented:</strong> {implemented.length ? implemented.join(', ') : 'None yet'}</p>
      <p><strong>Features still unavailable:</strong> {unavailable.length ? unavailable.join(', ') : 'None'}</p>
      <ul>
        {list.map(([label, status]) => (
          <li key={label} style={{ color: statusColor(status), fontWeight: 600 }}>
            {statusBadge(status)} — {label}
          </li>
        ))}
      </ul>

      <h3>STORY ENGINE</h3>
      <p><strong>Current target length:</strong> {displayValue(latestStory?.debug?.targetWords)}</p>
      <p><strong>Actual generated length:</strong> {displayValue(latestStory?.wordCount)}</p>
      <p><strong>Story validation:</strong> {latestStory?.qualityValidation?.coherent ? 'PASS' : latestStory ? 'FAIL/PARTIAL' : 'N/A'}</p>
      <p><strong>Research:</strong> {latestStory?.research?.completed ? '✓ Completed' : latestStory ? '⚠ Research failed/unavailable' : 'N/A'}</p>
      <p><strong>Page generation:</strong> {displayValue((latestStory?.pages || []).length)} pages</p>

      <h3>READING ENGINE</h3>
      <p><strong>Recording:</strong> {reading?.durationSeconds > 0 ? 'Captured' : reading ? 'Attempted' : 'Not run'}</p>
      <p><strong>Transcription:</strong> {reading?.transcript ? 'Available' : reading ? 'Missing' : 'Not run'}</p>
      <p><strong>Word alignment:</strong> {(reading?.alignment?.rows || []).length > 0 ? 'Available' : 'Not available'}</p>
      <p><strong>Accuracy:</strong> {displayValue(score?.accuracy?.score)}</p>
      <p><strong>Fluency:</strong> {displayValue(score?.fluency?.score)}</p>
      <p><strong>Speed:</strong> {displayValue(score?.speed?.score)}</p>
      <p><strong>Punctuation:</strong> {displayValue(score?.punctuation?.score)}</p>
      <p><strong>Expression:</strong> {displayValue(score?.expression?.score)}</p>

      <h3>AI</h3>
      <p><strong>Provider:</strong> Gemini API</p>
      <p><strong>Model:</strong> Story {displayValue(latestStory?.debug?.model)} / Transcription {displayValue(reading?.transcriptionModel)}</p>
      <p><strong>API status:</strong> {apiStatus}</p>
    </div>
  );
}
