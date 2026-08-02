import { createClient } from "@/lib/supabase/server";
import { localToday, localTimeLabel } from "@/lib/domain/schedule";
import {
  dayNumber,
  isRestDay,
  isWithinChallenge,
  targetForDate,
} from "@/lib/domain/challenge";
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

  const dow = new Date(`${today}T12:00:00`).getDay();
  const habLogs = new Map((habLogRes.data ?? []).map((l) => [l.habit_id, l]));
  const habits: TodayHabit[] = (habRes.data ?? [])
    .filter((h) => h.days_of_week.includes(dow))
    .map((h) => ({ habit: h, log: habLogs.get(h.id) ?? null }));

  return {
    profile,
    today,
    nowIso: now.toISOString(),
    dueNow,
    laterToday,
    resolved,
    challenges,
    habits,
  };
}
