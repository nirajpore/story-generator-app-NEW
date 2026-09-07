'use client';

import { useState, useEffect } from 'react';
import StoryGenerator from '@/components/StoryGenerator';
import StoryDisplay from '@/components/StoryDisplay';
import StoryList from '@/components/StoryList';
import { countWords } from '@/lib/story/pipeline';
import DeveloperStatusPanel from '@/components/DeveloperStatusPanel';
import { APP_NAME, APP_VERSION, BUILD_ID } from '@/lib/app/version';
import { loadAppState, saveAppState, summarizeRecentPerformance, updateDifficultWords } from '@/lib/storage/appState';

export default function Home() {
  const [stories, setStories] = useState([]);
  const [selectedStory, setSelectedStory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [appState, setAppState] = useState(null);
  const [showDevStatus, setShowDevStatus] = useState(false);
  const [apiStatus, setApiStatus] = useState('Not checked');

  useEffect(() => {
    const loaded = loadAppState();
    setAppState(loaded);
    setStories(loaded.stories || []);
  }, []);

  const commitState = (nextState) => {
    setAppState(nextState);
    saveAppState(nextState);
  };

  useEffect(() => {
    let cancelled = false;
    async function checkApi() {
      try {
        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        const data = await response.json();
        if (cancelled) return;
        if (response.status === 400 && data?.error === 'Character name is required') {
          setApiStatus('Reachable');
        } else {
          setApiStatus(`Unexpected status ${response.status}`);
        }
      } catch {
        if (!cancelled) setApiStatus('Unavailable');
      }
    }
    checkApi();
    return () => { cancelled = true; };
  }, []);

  const handleGenerateStory = async (storyData) => {
    setLoading(true);
    try {
      const latestStory = stories[0];
      const previousStoryWordCount = latestStory?.wordCount || (latestStory?.content ? countWords(latestStory.content) : undefined);
      const perf = summarizeRecentPerformance(appState?.readingSessions || []);
      const recentPerformance = perf.recentPerformance ?? (typeof latestStory?.latestReadingOverall === 'number'
        ? latestStory.latestReadingOverall / 10
        : undefined);
      const engagement = perf.engagement;

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...storyData,
          previousStoryWordCount,
          recentPerformance,
          engagement,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate story');
      }

      const data = await response.json();
      const newStory = {
        id: Date.now(),
        title: data.outline?.title || (storyData.characterName ? `${storyData.characterName}'s Adventure` : 'Untitled Story'),
        content: data.story,
        pages: data.pages || [],
        wordCount: data.wordCount || countWords(data.story || ''),
        research: data.research,
        qualityValidation: data.qualityValidation,
        debug: data.debug,
        outline: data.outline,
        ...storyData,
        createdAt: new Date().toISOString(),
      };

      const nextStories = [newStory, ...stories];
      setStories(nextStories);
      const nextState = {
        ...(appState || {}),
        stories: nextStories,
      };
      commitState(nextState);
      setSelectedStory(newStory);
    } catch (error) {
      alert('Error generating story: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStory = (id) => {
    const nextStories = stories.filter((story) => story.id !== id);
    setStories(nextStories);
    const nextState = {
      ...(appState || {}),
      stories: nextStories,
    };
    commitState(nextState);
    if (selectedStory?.id === id) {
      setSelectedStory(null);
    }
  };

  const handleStoryUpdate = (updatedStory) => {
    const nextStories = stories.map((item) => (item.id === updatedStory.id ? updatedStory : item));
    setStories(nextStories);

    let nextSessions = appState?.readingSessions || [];
    let nextDifficultWords = appState?.difficultWords || {};
    const analysis = updatedStory?.readingAnalysis;
    if (analysis?.analyzedAt) {
      const session = {
        id: analysis.analyzedAt,
        storyId: updatedStory.id,
        storyTitle: updatedStory.title,
        rwLevel: updatedStory.rwLevel,
        score: analysis.score,
        durationSeconds: analysis.durationSeconds,
        transcriptionModel: analysis.transcriptionModel,
        transcriptionProvider: analysis.transcriptionProvider,
        createdAt: analysis.analyzedAt,
      };
      nextSessions = [session, ...nextSessions.filter((item) => item.id !== session.id)].slice(0, 50);
      nextDifficultWords = updateDifficultWords(nextDifficultWords, analysis, analysis.analyzedAt);
    }

    const nextState = {
      ...(appState || {}),
      stories: nextStories,
      readingSessions: nextSessions,
      difficultWords: nextDifficultWords,
      childProfile: {
        ...(appState?.childProfile || {}),
        rwLevel: updatedStory.rwLevel || appState?.childProfile?.rwLevel || 'blue',
      },
    };
    commitState(nextState);
    setSelectedStory(updatedStory);
  };

  return (
    <div>
      <header style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h1>{APP_NAME} {APP_VERSION}</h1>
        <p style={{ color: '#fff', fontSize: '14px' }}>Build: {BUILD_ID}</p>
        <p style={{ color: '#fff', fontSize: '18px' }}>Create magical stories for your loved ones!</p>
        <button onClick={() => setShowDevStatus((prev) => !prev)} style={{ marginTop: '10px' }}>
          {showDevStatus ? 'Hide Development Status' : 'Show Development Status'}
        </button>
      </header>

      {showDevStatus && (
        <DeveloperStatusPanel latestStory={stories[0]} apiStatus={apiStatus} />
      )}

      {selectedStory ? (
        <StoryDisplay
          story={selectedStory}
          onStoryUpdate={handleStoryUpdate}
          onBack={() => setSelectedStory(null)}
          onDelete={() => {
            handleDeleteStory(selectedStory.id);
            setSelectedStory(null);
          }}
        />
      ) : (
        <div className="grid" style={{ marginBottom: '30px', gridTemplateColumns: '1fr 1fr' }}>
          <div>
            <StoryGenerator onGenerate={handleGenerateStory} loading={loading} />
          </div>
          <div>
            <StoryList stories={stories} onSelect={setSelectedStory} onDelete={handleDeleteStory} />
          </div>
        </div>
      )}
    </div>
  );
}
