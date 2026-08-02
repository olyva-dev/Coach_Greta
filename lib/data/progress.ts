import { addDays, format, isBefore, parseISO, startOfWeek, subDays } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { localDateOf, localToday } from "@/lib/domain/schedule";
import { computeStreak, dayOutcome, type DayOutcome } from "@/lib/domain/streaks";
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
  const logsByHabit = new Map<string, Map<string, boolean>>();
  for (const log of habLogRes.data ?? []) {
    let m = logsByHabit.get(log.habit_id);
    if (!m) {
      m = new Map();
      logsByHabit.set(log.habit_id, m);
    }
    m.set(log.local_date, log.value);
  }

  const habits: HabitProgress[] = (habRes.data ?? []).map((habit) => {
    const logs = logsByHabit.get(habit.id) ?? new Map<string, boolean>();
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

    return { habit, current, best, cells, weekWins, weekPossible };
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

  return { profile, today, weekStart, habits, challenges, reminders };
}
