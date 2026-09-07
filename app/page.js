'use client';

import { useEffect, useMemo, useState } from 'react';
import ThemeHome from '@/components/ThemeHome';
import ParentDashboard from '@/components/ParentDashboard';
import BookReader from '@/components/BookReader';
import SpeechTestPanel from '@/components/SpeechTestPanel';
import { loadState, saveState } from '@/lib/storage/appState';
import { generateStory } from '@/lib/services/storyService';
import { getChildAdventureLabel, getTargetPageCount, updateDifficultyProfile } from '@/lib/difficultyEngine';
import { countWords, storyTextFromPages } from '@/lib/storyUtils';

function toThemeId(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

export default function Home() {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentStory, setCurrentStory] = useState(null);
  const [offline, setOffline] = useState(false);
  const [parentUnlocked, setParentUnlocked] = useState(false);
  const [showParentPrompt, setShowParentPrompt] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const initial = loadState();
    setState(initial);
    setOffline(!navigator.onLine);

    const onOnline = () => setOffline(false);
    const onOffline = () => setOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    if (!state) return;
    saveState(state);
  }, [state]);

  const previousBestAccuracy = useMemo(
    () => (state?.readingSessions?.[0]?.accuracy || 70),
    [state?.readingSessions],
  );

  if (!state) return null;

  const updateThemes = (nextThemes) => {
    setState((prev) => ({
      ...prev,
      themes: nextThemes.map((theme, index) => ({ ...theme, order: index + 1 })),
    }));
  };

  const handlePickTheme = async (theme) => {
    if (!theme?.name || offline) return;
    setLoading(true);
    setErrorMessage('');
    try {
      const targetPages = getTargetPageCount(state.readingSessions);
      const story = await generateStory({
        theme: theme.name,
        childProfile: state.child,
        readingSessions: state.readingSessions,
        difficultWords: state.difficultWords,
        targetPageCount: targetPages,
        previousStories: state.stories.slice(0, 5),
      });

      const finalStory = {
        ...story,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        wordCount: story.wordCount || countWords(storyTextFromPages(story.pages)),
      };

      setState((prev) => ({
        ...prev,
        stories: [finalStory, ...prev.stories],
      }));
      setCurrentStory(finalStory);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSessionComplete = (sessionResult) => {
    setState((prev) => {
      const mergedWords = { ...prev.difficultWords };
      Object.values(sessionResult.difficultWords || {}).forEach((word) => {
        const existing = mergedWords[word.word] || { word: word.word, attempts: 0, correct: 0, missed: 0, confidence: 0.7 };
        mergedWords[word.word] = {
          ...existing,
          attempts: existing.attempts + word.attempts,
          correct: existing.correct + word.correct,
          missed: existing.missed + word.missed,
          confidence: Number((((existing.confidence || 0.7) + (word.confidence || 0.7)) / 2).toFixed(2)),
        };
      });

      const nextSessions = [sessionResult, ...prev.readingSessions];
      const nextChild = updateDifficultyProfile(prev.child, nextSessions);
      return {
        ...prev,
        child: nextChild,
        readingSessions: nextSessions,
        difficultWords: mergedWords,
      };
    });
  };

  const addTheme = (name) => {
    setState((prev) => ({
      ...prev,
      themes: [...prev.themes, { id: toThemeId(`${name}-${Date.now()}`), name, emoji: '🟩', favorite: false, order: prev.themes.length + 1 }],
    }));
  };

  const removeTheme = (id) => {
    updateThemes(state.themes.filter((theme) => theme.id !== id));
  };

  const updateTheme = (id, updates) => {
    updateThemes(state.themes.map((theme) => (theme.id === id ? { ...theme, ...updates } : theme)));
  };

  const moveTheme = (id, direction) => {
    const themes = [...state.themes];
    const index = themes.findIndex((t) => t.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= themes.length) return;
    const [item] = themes.splice(index, 1);
    themes.splice(target, 0, item);
    updateThemes(themes);
  };

  const openParentMode = () => {
    setShowParentPrompt(true);
    const value = prompt('Enter parent PIN');
    setShowParentPrompt(false);
    if (value === state.parentPin) {
      setParentUnlocked(true);
    } else if (value !== null) {
      alert('Incorrect PIN');
    }
  };

  if (currentStory) {
    return (
      <BookReader
        story={currentStory}
        speechEngine={state.activeSpeechEngine}
        previousBestAccuracy={previousBestAccuracy}
        onComplete={handleSessionComplete}
        onClose={() => setCurrentStory(null)}
      />
    );
  }

  if (parentUnlocked) {
    return (
      <ParentDashboard
        child={state.child}
        themes={state.themes}
        readingSessions={state.readingSessions}
        difficultWords={state.difficultWords}
        speechEngine={state.activeSpeechEngine}
        onSpeechEngineChange={(engine) => setState((prev) => ({ ...prev, activeSpeechEngine: engine }))}
        onClose={() => setParentUnlocked(false)}
        onAddTheme={addTheme}
        onDeleteTheme={removeTheme}
        onUpdateTheme={updateTheme}
        onMoveTheme={moveTheme}
        speechTest={<SpeechTestPanel engine={state.activeSpeechEngine} />}
      />
    );
  }

  return (
    <main>
      <ThemeHome
        themes={state.themes}
        loading={loading}
        offline={offline}
        adventureLabel={getChildAdventureLabel(state.child.currentLevel)}
        onPickTheme={handlePickTheme}
        onOpenParent={openParentMode}
      />
      {errorMessage ? <p className="error">{errorMessage}</p> : null}
      {showParentPrompt ? <p className="loading-note">Checking parent PIN...</p> : null}
      {!!state.stories.length && (
        <section className="saved-stories">
          <h3>📚 Previous adventures</h3>
          <div className="story-list">
            {state.stories.slice(0, 8).map((story) => (
              <button className="story-chip" key={story.id} onClick={() => setCurrentStory(story)}>
                {story.title}
              </button>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
