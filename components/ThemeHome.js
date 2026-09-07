'use client';

import { sortThemes } from '@/lib/storyUtils';

export default function ThemeHome({
  themes,
  onPickTheme,
  loading,
  offline,
  adventureLabel,
  onOpenParent,
}) {
  const sortedThemes = sortThemes(themes);
  return (
    <div className="home-shell">
      <div className="top-row">
        <h1>📚 What shall we read today?</h1>
        <button className="secondary-btn" onClick={onOpenParent}>Parent Mode</button>
      </div>
      <p className="adventure-label">{adventureLabel}</p>
      {offline && <p className="offline-msg">🌐 We need the internet to create your next story.</p>}
      <div className="theme-grid">
        {sortedThemes.map((theme) => (
          <button
            key={theme.id}
            className="theme-card"
            onClick={() => onPickTheme(theme)}
            disabled={loading}
          >
            <div className="theme-emoji">{theme.emoji || '✨'}</div>
            <div className="theme-name">{theme.name}</div>
            {theme.favorite ? <div className="favorite-tag">★ Favorite</div> : null}
          </button>
        ))}
        <button
          className="theme-card surprise-card"
          onClick={() => onPickTheme(sortedThemes[Math.floor(Math.random() * sortedThemes.length)])}
          disabled={loading || !sortedThemes.length}
        >
          <div className="theme-emoji">✨</div>
          <div className="theme-name">Surprise Me</div>
        </button>
      </div>
      {loading ? <p className="loading-note">Creating your next adventure...</p> : null}
    </div>
  );
}
