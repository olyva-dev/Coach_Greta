"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { localToday } from "@/lib/domain/schedule";
import { getModule } from "@/lib/modules/registry";
import { findLevel, sessionReps } from "@/lib/modules/types";

export async function recordSession(input: {
  moduleKey: string;
  levelKey: string;
  repsCompleted: number;
  setsCompleted: number;
  durationSeconds: number;
  completed: boolean;
  occurrenceId?: string | null;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not signed in");

  const mod = getModule(input.moduleKey);
  if (!mod) throw new Error("unknown module");
  const level = findLevel(mod, input.levelKey);

  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone")
    .single();
  const today = localToday(profile?.timezone ?? "America/Bogota");

  const { error } = await supabase.from("exercise_sessions").insert({
    user_id: user.id,
    module_key: input.moduleKey,
    level_key: input.levelKey,
    local_date: today,
    completed_at: input.completed ? new Date().toISOString() : null,
    status: input.completed ? "completed" : "abandoned",
    reps_completed: input.repsCompleted,
    reps_target: sessionReps(level),
    sets_completed: input.setsCompleted,
    sets_target: level.sets,
    duration_seconds: input.durationSeconds,
    occurrence_id: input.occurrenceId ?? null,
  });
  if (error) throw new Error(error.message);

  // finishing a guided session closes the reminder that sent you here
  if (input.completed && input.occurrenceId) {
    await supabase.rpc("apply_notification_action", {
      p_occurrence_id: input.occurrenceId,
      p_action: "done",
    });
  }

  revalidatePath("/today");
  revalidatePath("/progress");
  revalidatePath(`/modules/${input.moduleKey}`);
}
