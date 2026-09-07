'use client';

import { useMemo, useState } from 'react';
import { sortThemes } from '@/lib/storyUtils';

function formatTime(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  return `${hours}h ${mins}m`;
}

export default function ParentDashboard({
  child,
  themes,
  readingSessions,
  difficultWords,
  onClose,
  onUpdateTheme,
  onAddTheme,
  onDeleteTheme,
  onMoveTheme,
  speechTest,
  onSpeechEngineChange,
  speechEngine,
}) {
  const [newTheme, setNewTheme] = useState('');
  const sortedThemes = sortThemes(themes);
  const stats = useMemo(() => {
    if (!readingSessions.length) {
      return {
        avgAccuracy: 0,
        avgWpm: 0,
        avgScore: 0,
        storiesCompleted: 0,
        totalSeconds: 0,
      };
    }
    const total = readingSessions.length;
    const totalSeconds = readingSessions.reduce((sum, s) => sum + (s.durationSeconds || 0), 0);
    return {
      avgAccuracy: Math.round(readingSessions.reduce((sum, s) => sum + (s.accuracy || 0), 0) / total),
      avgWpm: Math.round(readingSessions.reduce((sum, s) => sum + (s.wordsPerMinute || 0), 0) / total),
      avgScore: Number((readingSessions.reduce((sum, s) => sum + (s.score || 0), 0) / total).toFixed(1)),
      storiesCompleted: total,
      totalSeconds,
    };
  }, [readingSessions]);

  const difficultTop = Object.values(difficultWords)
    .sort((a, b) => (b.missed || 0) - (a.missed || 0))
    .slice(0, 8);

  return (
    <div className="parent-shell">
      <div className="top-row">
        <h2>Parent Dashboard</h2>
        <button className="secondary-btn" onClick={onClose}>Back</button>
      </div>

      <div className="card-stack">
        <section className="panel">
          <h3>Reading profile</h3>
          <p><strong>Current internal level:</strong> {child.currentLevel} — approaching {child.nextMilestone}</p>
          <p><strong>Progress in level:</strong> {Math.round((child.levelProgress || 0) * 100)}%</p>
          <p><strong>Average score:</strong> {stats.avgScore}/10</p>
        </section>

        <section className="panel">
          <h3>Reading statistics</h3>
          <div className="stats-grid">
            <div><span>Accuracy</span><strong>{stats.avgAccuracy}%</strong></div>
            <div><span>Words/min</span><strong>{stats.avgWpm}</strong></div>
            <div><span>Stories completed</span><strong>{stats.storiesCompleted}</strong></div>
            <div><span>Total reading time</span><strong>{formatTime(stats.totalSeconds)}</strong></div>
          </div>
        </section>

        <section className="panel">
          <h3>Themes</h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newTheme.trim()) return;
              onAddTheme(newTheme.trim());
              setNewTheme('');
            }}
            className="theme-add-form"
          >
            <input
              value={newTheme}
              onChange={(e) => setNewTheme(e.target.value)}
              placeholder="Add theme (e.g. Minecraft)"
            />
            <button type="submit">Add Theme</button>
          </form>
          <div className="theme-list">
            {sortedThemes.map((theme, index) => (
              <div key={theme.id} className="theme-row">
                <div>
                  <strong>{theme.emoji || '✨'} {theme.name}</strong>
                  {theme.favorite ? <span className="fav-chip">Favorite</span> : null}
                </div>
                <div className="theme-actions">
                  <button onClick={() => {
                    const next = prompt('Rename theme', theme.name);
                    if (next?.trim()) onUpdateTheme(theme.id, { name: next.trim() });
                  }}
                  >Rename</button>
                  <button onClick={() => onUpdateTheme(theme.id, { favorite: !theme.favorite })}>
                    {theme.favorite ? 'Unfavorite' : 'Favorite'}
                  </button>
                  <button disabled={index === 0} onClick={() => onMoveTheme(theme.id, -1)}>↑</button>
                  <button disabled={index === sortedThemes.length - 1} onClick={() => onMoveTheme(theme.id, 1)}>↓</button>
                  <button onClick={() => onDeleteTheme(theme.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <h3>Speech recognition</h3>
          <label htmlFor="speechEngine">Engine</label>
          <select
            id="speechEngine"
            value={speechEngine}
            onChange={(e) => onSpeechEngineChange(e.target.value)}
          >
            <option value="recording-first">Recording + analysis (recommended)</option>
            <option value="browser-live">Browser live transcription baseline</option>
            <option value="whisper">Whisper (future option)</option>
            <option value="native-ios">Native iOS wrapper (future option)</option>
            <option value="cloud">Cloud speech (future option)</option>
          </select>
          {speechTest}
        </section>

        <section className="panel">
          <h3>Difficult words</h3>
          {!difficultTop.length ? (
            <p>No difficult words tracked yet.</p>
          ) : (
            <ul className="word-list">
              {difficultTop.map((word) => (
                <li key={word.word}>
                  <strong>{word.word}</strong> — attempts: {word.attempts}, correct: {word.correct}, missed: {word.missed}, confidence: {word.confidence}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
