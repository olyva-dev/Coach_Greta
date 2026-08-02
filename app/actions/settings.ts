"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateProfile(input: {
  displayName: string | null;
  timezone: string;
  quietHoursStart: string | null; // "HH:mm" or null
  quietHoursEnd: string | null;
  weekStartsOn: number;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not signed in");

  const bothOrNeither =
    (input.quietHoursStart === null) === (input.quietHoursEnd === null);
  if (!bothOrNeither) {
    throw new Error("Set both quiet hours or neither");
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: input.displayName,
      timezone: input.timezone,
      quiet_hours_start: input.quietHoursStart
        ? `${input.quietHoursStart}:00`
        : null,
      quiet_hours_end: input.quietHoursEnd ? `${input.quietHoursEnd}:00` : null,
      week_starts_on: input.weekStartsOn === 0 ? 0 : 1,
    })
    .eq("id", user.id);
  if (error) throw new Error(error.message);

  // timezone changes shift the schedule grid, rebuild it now
  await supabase
    .from("reminder_occurrences")
    .delete()
    .eq("status", "pending")
    .gt("scheduled_for", new Date().toISOString());
  await supabase.rpc("refresh_my_schedules");

  revalidatePath("/settings");
  revalidatePath("/today");
}

export async function exportAllData(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not signed in");

  const [profiles, reminders, occurrences, challenges, challengeLogs, habits, habitLogs] =
    await Promise.all([
      supabase.from("profiles").select("*"),
      supabase.from("reminders").select("*"),
      supabase.from("reminder_occurrences").select("*"),
      supabase.from("challenges").select("*"),
      supabase.from("challenge_logs").select("*"),
      supabase.from("habits").select("*"),
      supabase.from("habit_logs").select("*"),
    ]);

  return JSON.stringify(
    {
      exported_at: new Date().toISOString(),
      profile: profiles.data?.[0] ?? null,
      reminders: reminders.data ?? [],
      reminder_occurrences: occurrences.data ?? [],
      challenges: challenges.data ?? [],
      challenge_logs: challengeLogs.data ?? [],
      habits: habits.data ?? [],
      habit_logs: habitLogs.data ?? [],
    },
    null,
    2
  );
}
