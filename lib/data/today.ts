import { createClient } from "@/lib/supabase/server";
import { localToday, localTimeLabel } from "@/lib/domain/schedule";
import {
  dayNumber,
  isRestDay,
  isWithinChallenge,
  targetForDate,
} from "@/lib/domain/challenge";
import { isScheduledOn } from "@/lib/domain/habits";
import type { Profile } from "@/lib/db/types";
import type {
  TodayChallenge,
  TodayHabit,
  TodayOccurrence,
} from "@/lib/domain/view";

export interface TodayData {
  profile: Profile;
  today: string;
  nowIso: string;
  dueNow: TodayOccurrence[];
  laterToday: TodayOccurrence[];
  resolved: TodayOccurrence[];
  challenges: TodayChallenge[];
  habits: TodayHabit[];
  // how much of today is closed out, 0..1
  dayProgress: number;
  doneCount: number;
  totalCount: number;
}

export async function getTodayData(): Promise<TodayData> {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .single();
  if (!profile) throw new Error("profile missing");

  const today = localToday(profile.timezone);
  const now = new Date();

  const [occRes, remRes, chRes, chLogRes, habRes, habLogRes] =
    await Promise.all([
      supabase
        .from("reminder_occurrences")
        .select("*")
        .eq("local_date", today)
        .order("scheduled_for"),
      supabase.from("reminders").select("*"),
      supabase
        .from("challenges")
        .select("*")
        .eq("status", "active")
        .order("sort_order"),
      supabase.from("challenge_logs").select("*").eq("local_date", today),
      supabase
        .from("habits")
        .select("*")
        .eq("status", "active")
        .order("sort_order"),
      supabase.from("habit_logs").select("*").eq("local_date", today),
    ]);

  const reminders = new Map((remRes.data ?? []).map((r) => [r.id, r]));

  const occurrences: TodayOccurrence[] = (occRes.data ?? []).flatMap((o) => {
    const reminder = reminders.get(o.reminder_id);
    if (!reminder || reminder.status === "archived") return [];
    return [
      {
        occurrence: o,
        reminder,
        timeLabel: localTimeLabel(o.scheduled_for, profile.timezone),
      },
    ];
  });

  const open = new Set(["pending", "notified", "snoozed"]);
  const dueNow = occurrences.filter(
    (o) =>
      open.has(o.occurrence.status) &&
      new Date(o.occurrence.scheduled_for) <= now
  );
  const laterToday = occurrences.filter(
    (o) =>
      open.has(o.occurrence.status) &&
      new Date(o.occurrence.scheduled_for) > now
  );
  const resolved = occurrences.filter((o) => !open.has(o.occurrence.status));

  const chLogs = new Map(
    (chLogRes.data ?? []).map((l) => [l.challenge_id, l])
  );
  const challenges: TodayChallenge[] = (chRes.data ?? [])
    .filter((c) => isWithinChallenge(c, today))
    .map((c) => ({
      challenge: c,
      day: dayNumber(c, today),
      target: isRestDay(c, today) ? null : targetForDate(c, today),
      log: chLogs.get(c.id) ?? null,
    }));

  const habLogs = new Map((habLogRes.data ?? []).map((l) => [l.habit_id, l]));
  const habits: TodayHabit[] = (habRes.data ?? [])
    .filter((h) => isScheduledOn(h, today))
    .map((h) => ({ habit: h, log: habLogs.get(h.id) ?? null }));

  // day completion: every reminder occurrence, challenge target and
  // scheduled habit counts once
  const habitDone = habits.filter(({ habit, log }) =>
    habit.polarity === "negative" ? log === null || !log.value : log?.value === true
  ).length;
  const challengeDone = challenges.filter(
    (c) => c.target === null || c.log !== null
  ).length;
  const reminderDone = occurrences.filter(
    (o) => !open.has(o.occurrence.status)
  ).length;

  const totalCount = habits.length + challenges.length + occurrences.length;
  const doneCount = habitDone + challengeDone + reminderDone;

  return {
    profile,
    today,
    nowIso: now.toISOString(),
    dueNow,
    laterToday,
    resolved,
    challenges,
    habits,
    dayProgress: totalCount === 0 ? 0 : doneCount / totalCount,
    doneCount,
    totalCount,
  };
}
