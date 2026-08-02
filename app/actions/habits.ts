"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { HabitPolarity, ItemStatus } from "@/lib/db/types";

export async function setHabitLog(
  habitId: string,
  localDate: string,
  value: boolean | null
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not signed in");

  if (value === null) {
    const { error } = await supabase
      .from("habit_logs")
      .delete()
      .eq("habit_id", habitId)
      .eq("local_date", localDate);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("habit_logs").upsert(
      {
        user_id: user.id,
        habit_id: habitId,
        local_date: localDate,
        value,
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
  daysOfWeek: number[];
  requireExplicitCheck: boolean;
}

export async function createHabit(input: HabitInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not signed in");

  const { error } = await supabase.from("habits").insert({
    user_id: user.id,
    name: input.name,
    emoji: input.emoji,
    polarity: input.polarity,
    days_of_week: input.daysOfWeek,
    require_explicit_check: input.requireExplicitCheck,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/manage/habits");
  revalidatePath("/today");
}

export async function updateHabit(id: string, input: HabitInput) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("habits")
    .update({
      name: input.name,
      emoji: input.emoji,
      polarity: input.polarity,
      days_of_week: input.daysOfWeek,
      require_explicit_check: input.requireExplicitCheck,
    })
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
