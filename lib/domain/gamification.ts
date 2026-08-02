// Gamification derived entirely from existing logs: no extra tables, so it
// stays portable and can never drift out of sync with the real history.

export const XP_PER_HABIT_WIN = 10;
export const XP_PER_CHALLENGE_DAY = 15;
export const XP_PER_REMINDER_DONE = 5;
export const XP_PER_PERFECT_DAY = 25;

export interface XpBreakdown {
  habitWins: number;
  challengeDays: number;
  remindersDone: number;
  perfectDays: number;
}

export function totalXp(b: XpBreakdown): number {
  return (
    b.habitWins * XP_PER_HABIT_WIN +
    b.challengeDays * XP_PER_CHALLENGE_DAY +
    b.remindersDone * XP_PER_REMINDER_DONE +
    b.perfectDays * XP_PER_PERFECT_DAY
  );
}

export interface Level {
  level: number;
  title: string;
  xpIntoLevel: number;
  xpForLevel: number;
  progress: number; // 0..1 toward the next level
}

const TITLES = [
  "Getting started",
  "Warming up",
  "Finding rhythm",
  "Consistent",
  "Committed",
  "Disciplined",
  "Relentless",
  "Machine",
  "Unstoppable",
  "Legend",
];

// Each level costs 100 XP more than the last: 100, 200, 300 ...
// Cumulative XP for level n is 50 * n * (n + 1).
export function levelFromXp(xp: number): Level {
  let level = 1;
  while (50 * (level + 1) * (level + 2) <= xp) level += 1;
  const floorXp = 50 * level * (level + 1);
  const xpForLevel = 100 * (level + 1);
  const xpIntoLevel = xp - floorXp;
  return {
    level,
    title: TITLES[Math.min(level - 1, TITLES.length - 1)],
    xpIntoLevel,
    xpForLevel,
    progress: Math.max(0, Math.min(1, xpIntoLevel / xpForLevel)),
  };
}

export interface Badge {
  id: string;
  label: string;
  emoji: string;
  earned: boolean;
  detail: string;
}

export const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100];

export function streakBadges(bestStreak: number): Badge[] {
  return STREAK_MILESTONES.map((days) => ({
    id: `streak-${days}`,
    label: `${days} day streak`,
    emoji:
      days >= 100 ? "👑" : days >= 60 ? "💎" : days >= 30 ? "🏆" : days >= 14 ? "⚡" : days >= 7 ? "🔥" : "✨",
    earned: bestStreak >= days,
    detail:
      bestStreak >= days
        ? "Earned"
        : `${days - bestStreak} more day${days - bestStreak > 1 ? "s" : ""}`,
  }));
}

// A perfect day: every scheduled habit won, every challenge target met, and
// no reminder left unresolved. Callers pass the per day counts.
export interface DayTally {
  habitsScheduled: number;
  habitWins: number;
  challengesDue: number;
  challengesDone: number;
  remindersDue: number;
  remindersDone: number;
}

export function isPerfectDay(t: DayTally): boolean {
  const anything =
    t.habitsScheduled + t.challengesDue + t.remindersDue > 0;
  return (
    anything &&
    t.habitWins === t.habitsScheduled &&
    t.challengesDone === t.challengesDue &&
    t.remindersDone === t.remindersDue
  );
}
