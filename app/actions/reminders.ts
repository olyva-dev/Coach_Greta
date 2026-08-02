"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ItemStatus, RetryPolicy, ScheduleKind } from "@/lib/db/types";

export interface ReminderInput {
  name: string;
  emoji: string | null;
  notes: string | null;
  scheduleKind: ScheduleKind;
  times: string[] | null;
  intervalMinutes: number | null;
  windowStart: string | null;
  windowEnd: string | null;
  daysOfWeek: number[];
  retryPolicy: RetryPolicy;
  retryIntervalMinutes: number;
  maxRetries: number;
  snoozeMinutes: number;
}

function toRow(input: ReminderInput) {
  return {
    name: input.name,
    emoji: input.emoji,
    notes: input.notes,
    schedule_kind: input.scheduleKind,
    times: input.scheduleKind === "fixed_times" ? input.times : null,
    interval_minutes:
      input.scheduleKind === "interval" ? input.intervalMinutes : null,
    window_start: input.scheduleKind === "interval" ? input.windowStart : null,
    window_end: input.scheduleKind === "interval" ? input.windowEnd : null,
    days_of_week: input.daysOfWeek,
    retry_policy: input.retryPolicy,
    retry_interval_minutes: input.retryIntervalMinutes,
    max_retries: input.maxRetries,
    snooze_minutes: input.snoozeMinutes,
  };
}

export async function createReminder(input: ReminderInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not signed in");

  const { error } = await supabase
    .from("reminders")
    .insert({ user_id: user.id, ...toRow(input) });
  if (error) throw new Error(error.message);
  await supabase.rpc("refresh_my_schedules");
  revalidatePath("/manage/reminders");
  revalidatePath("/today");
}

export async function updateReminder(id: string, input: ReminderInput) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("reminders")
    .update(toRow(input))
    .eq("id", id);
  if (error) throw new Error(error.message);

  // schedule changed: drop this reminder's future pending occurrences and
  // regenerate them under the new schedule right away
  await supabase
    .from("reminder_occurrences")
    .delete()
    .eq("reminder_id", id)
    .eq("status", "pending")
    .gt("scheduled_for", new Date().toISOString());
  await supabase.rpc("refresh_my_schedules");

  revalidatePath("/manage/reminders");
  revalidatePath("/today");
}

export async function setReminderStatus(id: string, status: ItemStatus) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("reminders")
    .update({ status })
    .eq("id", id);
  if (error) throw new Error(error.message);

  if (status !== "active") {
    // withdraw untouched occurrences immediately, not at the next cron tick
    await supabase
      .from("reminder_occurrences")
      .delete()
      .eq("reminder_id", id)
      .eq("status", "pending");
  } else {
    await supabase.rpc("refresh_my_schedules");
  }

  revalidatePath("/manage/reminders");
  revalidatePath("/today");
}
