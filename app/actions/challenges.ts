"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ChallengeLogStatus, ItemStatus } from "@/lib/db/types";

export async function logChallengeDay(input: {
  challengeId: string;
  localDate: string;
  dayNumber: number;
  targetAmount: number;
  status: ChallengeLogStatus;
  completedAmount?: number;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not signed in");

  const { error } = await supabase.from("challenge_logs").upsert(
    {
      user_id: user.id,
      challenge_id: input.challengeId,
      local_date: input.localDate,
      day_number: input.dayNumber,
      target_amount: input.targetAmount,
      status: input.status,
      completed_amount:
        input.status === "done"
          ? input.targetAmount
          : (input.completedAmount ?? null),
    },
    { onConflict: "challenge_id,local_date" }
  );
  if (error) throw new Error(error.message);
  revalidatePath("/today");
  revalidatePath("/progress");
}

export async function clearChallengeLog(challengeId: string, localDate: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("challenge_logs")
    .delete()
    .eq("challenge_id", challengeId)
    .eq("local_date", localDate);
  if (error) throw new Error(error.message);
  revalidatePath("/today");
  revalidatePath("/progress");
}

export interface ChallengeInput {
  name: string;
  exercises: string[];
  unit: string;
  startDate: string;
  durationDays: number;
  progressionKind: "linear" | "fixed" | "custom";
  startAmount: number | null;
  increment: number;
  maxAmount: number | null;
  customAmounts: number[] | null;
  restDays: number[];
}

export async function createChallenge(input: ChallengeInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not signed in");

  const { error } = await supabase.from("challenges").insert({
    user_id: user.id,
    name: input.name,
    exercises: input.exercises,
    unit: input.unit,
    start_date: input.startDate,
    duration_days: input.durationDays,
    progression_kind: input.progressionKind,
    start_amount: input.startAmount,
    increment: input.increment,
    max_amount: input.maxAmount,
    custom_amounts: input.customAmounts,
    rest_days: input.restDays,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/manage/challenges");
  revalidatePath("/today");
}

export async function updateChallenge(id: string, input: ChallengeInput) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("challenges")
    .update({
      name: input.name,
      exercises: input.exercises,
      unit: input.unit,
      start_date: input.startDate,
      duration_days: input.durationDays,
      progression_kind: input.progressionKind,
      start_amount: input.startAmount,
      increment: input.increment,
      max_amount: input.maxAmount,
      custom_amounts: input.customAmounts,
      rest_days: input.restDays,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/manage/challenges");
  revalidatePath("/today");
}

export async function setChallengeStatus(id: string, status: ItemStatus) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("challenges")
    .update({ status })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/manage/challenges");
  revalidatePath("/today");
}
