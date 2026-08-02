import { addDays, format, isBefore, parseISO, startOfWeek, subDays } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { localDateOf, localToday } from "@/lib/domain/schedule";
import {
  computeStreak,
  dayOutcome,
  type DayOutcome,
  type LoggedDay,
} from "@/lib/domain/streaks";
import {
  levelFromXp,
  streakBadges,
  totalXp,
  type Badge,
  type Level,
} from "@/lib/domain/gamification";
import { dayNumber, targetForDay } from "@/lib/domain/challenge";
import type { Challenge, Habit, Profile, Reminder } from "@/lib/db/types";

const HEATMAP_DAYS = 84; // 12 weeks

export interface HeatmapCell {
  date: string;
  outcome: DayOutcome | "before"; // before habit creation
}

export interface HabitProgress {
  habit: Habit;
  current: number;
  best: number;
  cells: HeatmapCell[];
  weekWins: number;
  weekPossible: number;
  // last 14 scheduled days, for the numeric bar spark
  recentAmounts: number[];
  recentHits: boolean[];
}

export interface ChallengeProgress {
  challenge: Challenge;
  day: number; // clamped to [0, duration]
  doneDays: number;
  skippedDays: number;
  totalVolume: number;
  todayTarget: number | null;
}

export interface ReminderAdherence {
  reminder: Reminder;
  done: number;
  missed: number;
  snoozedOrPending: number;
  adherencePct: number | null; // null when no closed occurrences yet
}

export interface ProgressData {
  profile: Profile;
  today: string;
  weekStart: string;
  habits: HabitProgress[];
  challenges: ChallengeProgress[];
  reminders: ReminderAdherence[];
  level: Level;
  xp: number;
  badges: Badge[];
  perfectDays: number;
  bestStreak: number;
  // habit completion per day for the current week, 0..100
  weekSeries: number[];
  weekLabels: string[];
  insight: string;
}

export async function getProgressData(): Promise<ProgressData> {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .single();
  if (!profile) throw new Error("profile missing");

  const today = localToday(profile.timezone);
  const weekStartsOn = profile.week_starts_on === 0 ? 0 : 1;
  const weekStart = format(
    startOfWeek(parseISO(today), { weekStartsOn }),
    "yyyy-MM-dd"
  );
  const gridStart = format(
    startOfWeek(subDays(parseISO(today), HEATMAP_DAYS - 1), { weekStartsOn }),
    "yyyy-MM-dd"
  );

  const [habRes, habLogRes, chRes, chLogRes, remRes, occRes] =
    await Promise.all([
      supabase
        .from("habits")
        .select("*")
        .eq("status", "active")
        .order("sort_order"),
      supabase.from("habit_logs").select("*").gte("local_date", gridStart),
      supabase
        .from("challenges")
        .select("*")
        .neq("status", "archived")
        .order("sort_order"),
      supabase.from("challenge_logs").select("*"),
      supabase
        .from("reminders")
        .select("*")
        .eq("status", "active")
        .order("sort_order"),
      supabase
        .from("reminder_occurrences")
        .select("reminder_id, status, local_date")
        .gte("local_date", format(subDays(parseISO(today), 29), "yyyy-MM-dd")),
    ]);

  // habits
  const logsByHabit = new Map<string, Map<string, LoggedDay>>();
  for (const log of habLogRes.data ?? []) {
    let m = logsByHabit.get(log.habit_id);
    if (!m) {
      m = new Map();
      logsByHabit.set(log.habit_id, m);
    }
    m.set(log.local_date, { value: log.value, amount: log.amount });
  }

  const habits: HabitProgress[] = (habRes.data ?? []).map((habit) => {
    const logs = logsByHabit.get(habit.id) ?? new Map<string, LoggedDay>();
    const created = localDateOf(habit.created_at, profile.timezone);
    const from = created > gridStart ? created : gridStart;

    const { current, best } = computeStreak(habit, logs, from, today);

    const cells: HeatmapCell[] = [];
    let weekWins = 0;
    let weekPossible = 0;
    let cursor = parseISO(gridStart);
    const end = parseISO(today);
    while (cursor <= end) {
      const date = format(cursor, "yyyy-MM-dd");
      if (isBefore(cursor, parseISO(from))) {
        cells.push({ date, outcome: "before" });
      } else {
        const outcome = dayOutcome(habit, date, today, logs.get(date));
        cells.push({ date, outcome });
        if (date >= weekStart) {
          if (outcome === "win") {
            weekWins += 1;
            weekPossible += 1;
          } else if (outcome === "lose") {
            weekPossible += 1;
          }
        }
      }
      cursor = addDays(cursor, 1);
    }

    const recent = cells.slice(-14);
    const recentAmounts = recent.map((c) => logs.get(c.date)?.amount ?? 0);
    const recentHits = recent.map((c) => c.outcome === "win");

    return {
      habit,
      current,
      best,
      cells,
      weekWins,
      weekPossible,
      recentAmounts,
      recentHits,
    };
  });

  // challenges
  const challenges: ChallengeProgress[] = (chRes.data ?? []).map(
    (challenge) => {
      const logs = (chLogRes.data ?? []).filter(
        (l) => l.challenge_id === challenge.id
      );
      const rawDay = dayNumber(challenge, today);
      const day = Math.max(0, Math.min(rawDay, challenge.duration_days));
      const doneDays = logs.filter(
        (l) => l.status === "done" || l.status === "partial"
      ).length;
      const skippedDays = logs.filter((l) => l.status === "skipped").length;
      const totalVolume = logs.reduce(
        (sum, l) => sum + (l.completed_amount ?? 0),
        0
      );
      const todayTarget =
        rawDay >= 1 && rawDay <= challenge.duration_days
          ? targetForDay(challenge, rawDay)
          : null;
      return { challenge, day, doneDays, skippedDays, totalVolume, todayTarget };
    }
  );

  // reminders, last 30 days
  const reminders: ReminderAdherence[] = (remRes.data ?? []).map((reminder) => {
    const occ = (occRes.data ?? []).filter(
      (o) => o.reminder_id === reminder.id
    );
    const done = occ.filter((o) => o.status === "done").length;
    const missed = occ.filter((o) => o.status === "missed").length;
    const snoozedOrPending = occ.filter((o) =>
      ["pending", "notified", "snoozed"].includes(o.status)
    ).length;
    const closed = done + missed;
    return {
      reminder,
      done,
      missed,
      snoozedOrPending,
      adherencePct: closed === 0 ? null : Math.round((done / closed) * 100),
    };
  });

  // gamification, all derived from the logs above
  const habitWins = habits.reduce(
    (sum, h) => sum + h.cells.filter((c) => c.outcome === "win").length,
    0
  );
  const challengeDays = (chLogRes.data ?? []).filter(
    (l) => l.status === "done" || l.status === "partial"
  ).length;
  const remindersDone = (occRes.data ?? []).filter(
    (o) => o.status === "done"
  ).length;

  // a perfect day needs every scheduled habit won on that date
  const perfectDays = (() => {
    if (habits.length === 0) return 0;
    const dates = habits[0].cells.map((c) => c.date);
    let count = 0;
    for (const date of dates) {
      let scheduled = 0;
      let wins = 0;
      for (const h of habits) {
        const cell = h.cells.find((c) => c.date === date);
        if (!cell || cell.outcome === "neutral" || cell.outcome === "before")
          continue;
        scheduled += 1;
        if (cell.outcome === "win") wins += 1;
      }
      if (scheduled > 0 && wins === scheduled) count += 1;
    }
    return count;
  })();

  const xp = totalXp({
    habitWins,
    challengeDays,
    remindersDone,
    perfectDays,
  });
  const bestStreak = habits.reduce((max, h) => Math.max(max, h.best), 0);

  // this week's habit completion, one point per day up to today
  const weekSeries: number[] = [];
  const weekLabels: string[] = [];
  {
    let cursor = parseISO(weekStart);
    const end = parseISO(today);
    while (cursor <= end) {
      const date = format(cursor, "yyyy-MM-dd");
      let scheduled = 0;
      let wins = 0;
      for (const h of habits) {
        const cell = h.cells.find((c) => c.date === date);
        if (!cell || cell.outcome === "neutral" || cell.outcome === "before")
          continue;
        scheduled += 1;
        if (cell.outcome === "win") wins += 1;
      }
      weekSeries.push(scheduled === 0 ? 0 : Math.round((wins / scheduled) * 100));
      weekLabels.push(format(cursor, "EEEEE"));
      cursor = addDays(cursor, 1);
    }
  }

  // one honest, computed line about the week
  const insight = (() => {
    const numeric = habits.filter((h) => h.habit.kind === "numeric");
    if (numeric.length > 0) {
      const h = numeric[0];
      const logged = h.recentAmounts.filter((a) => a > 0);
      if (logged.length >= 3) {
        const avg = Math.round(
          logged.reduce((s, a) => s + a, 0) / logged.length
        );
        const target = h.habit.target_value ?? 0;
        const diff = avg - target;
        return diff >= 0
          ? `${h.habit.name} is averaging ${avg.toLocaleString()}, ${diff.toLocaleString()} above target.`
          : `${h.habit.name} is averaging ${avg.toLocaleString()}, ${Math.abs(diff).toLocaleString()} short of target.`;
      }
    }
    const leader = habits.reduce(
      (best, h) => (h.current > (best?.current ?? -1) ? h : best),
      habits[0]
    );
    if (leader && leader.current >= 3) {
      return `${leader.habit.name} is on a ${leader.current} day streak, your best is ${leader.best}.`;
    }
    if (perfectDays > 0) {
      return `You have logged ${perfectDays} perfect day${perfectDays > 1 ? "s" : ""} so far. Keep the checklist closed out.`;
    }
    return "Log a few days and this is where the patterns will show up.";
  })();

  return {
    profile,
    today,
    weekStart,
    habits,
    challenges,
    reminders,
    level: levelFromXp(xp),
    xp,
    badges: streakBadges(bestStreak),
    perfectDays,
    bestStreak,
    weekSeries,
    weekLabels,
    insight,
  };
}
