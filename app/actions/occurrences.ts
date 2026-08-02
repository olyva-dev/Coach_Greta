"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type OccurrenceAction = "done" | "snooze" | "skip" | "undo";

export async function markOccurrence(
  occurrenceId: string,
  action: OccurrenceAction
) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("apply_notification_action", {
    p_occurrence_id: occurrenceId,
    p_action: action,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/today");
  revalidatePath("/progress");
}
