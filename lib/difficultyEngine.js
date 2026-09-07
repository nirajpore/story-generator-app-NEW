import { INTERNAL_LEVELS } from '@/lib/constants';

export function getChildAdventureLabel(level) {
  const idx = Math.max(INTERNAL_LEVELS.indexOf(level), 0);
  return `🌟 Reading Adventure ${idx + 1}`;
}

export function getTargetPageCount(readingSessions = []) {
  const recent = readingSessions.slice(0, 5);
  const avgScore = recent.length
    ? recent.reduce((sum, item) => sum + (item.score || 0), 0) / recent.length
    : 7;

  if (avgScore >= 8.5) return 6;
  if (avgScore >= 7.5) return 5;
  return 4;
}

export function updateDifficultyProfile(child, readingSessions = []) {
  const recent = readingSessions.slice(0, 4);
  if (recent.length < 3) return child;

  const avgAccuracy = recent.reduce((sum, item) => sum + (item.accuracy || 0), 0) / recent.length;
  const avgFluency = recent.reduce((sum, item) => sum + (item.fluency || 0), 0) / recent.length;
  const improving = recent[0]?.score > (recent[recent.length - 1]?.score || 0);

  let progressShift = 0;
  if (avgAccuracy > 85 && avgFluency > 70 && improving) progressShift = 0.08;
  if (avgAccuracy < 70) progressShift = -0.04;

  const nextProgress = Math.min(1, Math.max(0.6, (child.levelProgress || 0.85) + progressShift));
  const next = { ...child, levelProgress: nextProgress };

  if (child.currentLevel === 'blue' && nextProgress > 0.95 && avgAccuracy > 88) {
    return { ...next, currentLevel: 'grey', nextMilestone: 'grey' };
  }

  return next;
}
