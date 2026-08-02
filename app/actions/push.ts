"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function saveSubscription(input: {
  endpoint: string;
  p256dh: string;
  auth: string;
  deviceLabel: string;
  userAgent: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not signed in");

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: input.endpoint,
      p256dh: input.p256dh,
      auth: input.auth,
      device_label: input.deviceLabel,
      user_agent: input.userAgent,
      enabled: true,
      failure_count: 0,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" }
  );
  if (error) throw new Error(error.message);
  revalidatePath("/settings");
}

export async function removeSubscription(endpoint: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint);
  if (error) throw new Error(error.message);
  revalidatePath("/settings");
}

export async function setSubscriptionEnabled(id: string, enabled: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("push_subscriptions")
    .update({ enabled, failure_count: 0 })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/settings");
}

export async function renameSubscription(id: string, deviceLabel: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("push_subscriptions")
    .update({ device_label: deviceLabel })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/settings");
}
