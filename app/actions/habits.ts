"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type {
  HabitKind,
  HabitPolarity,
  HabitScheduleKind,
  ItemStatus,
} from "@/lib/db/types";

// Boolean habits pass value. Numeric habits pass amount and the server
// derives value from the habit's target, so streak logic stays uniform.
export async function setHabitLog(
  habitId: string,
  localDate: string,
  input: { value?: boolean | null; amount?: number | null }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not signed in");

  const clearing =
    (input.value === null || input.value === undefined) &&
    (input.amount === null || input.amount === undefined);

  if (clearing) {
    const { error } = await supabase
      .from("habit_logs")
      .delete()
      .eq("habit_id", habitId)
      .eq("local_date", localDate);
    if (error) throw new Error(error.message);
  } else {
    let value = input.value ?? false;
    let amount: number | null = null;

    if (input.amount !== undefined && input.amount !== null) {
      const { data: habit } = await supabase
        .from("habits")
        .select("target_value")
        .eq("id", habitId)
        .single();
      amount = input.amount;
      value = amount >= (habit?.target_value ?? 0);
    }

    const { error } = await supabase.from("habit_logs").upsert(
      {
        user_id: user.id,
        habit_id: habitId,
        local_date: localDate,
        value,
        amount,
        logged_at: new Date().toISOString(),
      },
      { onConflict: "habit_id,local_date" }
    );
    if (error) throw new Error(error.message);
  }
  revalidatePath("/today");
  revalidatePath("/progress");
}

export interface HabitInput {
  name: string;
  emoji: string | null;
  polarity: HabitPolarity;
  kind: HabitKind;
  targetValue: number | null;
  unit: string | null;
  scheduleKind: HabitScheduleKind;
  daysOfWeek: number[];
  cycleOnDays: number | null;
  cycleOffDays: number | null;
  cycleAnchorDate: string | null;
  requireExplicitCheck: boolean;
}

function toRow(input: HabitInput) {
  const cycle = input.scheduleKind === "cycle";
  return {
    name: input.name,
    emoji: input.emoji,
    polarity: input.polarity,
    kind: input.kind,
    target_value: input.kind === "numeric" ? input.targetValue : null,
    unit: input.kind === "numeric" ? input.unit : null,
    schedule_kind: input.scheduleKind,
    days_of_week: input.daysOfWeek,
    cycle_on_days: cycle ? input.cycleOnDays : null,
    cycle_off_days: cycle ? input.cycleOffDays : null,
    cycle_anchor_date: cycle ? input.cycleAnchorDate : null,
    require_explicit_check:
      input.polarity === "negative" ? input.requireExplicitCheck : false,
  };
}

export async function createHabit(input: HabitInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not signed in");

  const { error } = await supabase
    .from("habits")
    .insert({ user_id: user.id, ...toRow(input) });
  if (error) throw new Error(error.message);
  revalidatePath("/manage/habits");
  revalidatePath("/today");
}

export async function updateHabit(id: string, input: HabitInput) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("habits")
    .update(toRow(input))
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/manage/habits");
  revalidatePath("/today");
}

export async function setHabitStatus(id: string, status: ItemStatus) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("habits")
    .update({ status })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/manage/habits");
  revalidatePath("/today");
}
