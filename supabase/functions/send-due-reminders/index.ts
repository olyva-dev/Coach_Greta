// Coach Greta: delivery Edge Function.
// Invoked two ways:
//   * by pg_cron every minute with the x-cron-secret header: claims due
//     occurrences and pushes them to every enabled subscription
//   * by the app with a user JWT and {"test": true}: sends a test push to
//     that user's devices
// Deployed with verify_jwt = false (see supabase/config.toml); auth happens
// here explicitly.

import { createClient } from "npm:@supabase/supabase-js@2";
import * as webpush from "jsr:@negrel/webpush@0.5";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY =
  Deno.env.get("SERVICE_KEY") ??
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
  "";
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";
const ACTION_TOKEN_SECRET = Deno.env.get("ACTION_TOKEN_SECRET") ?? "";
const VAPID_KEYS_JSON = Deno.env.get("VAPID_KEYS_JSON") ?? "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@localhost";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Claimed {
  occurrence_id: string;
  user_id: string;
  reminder_id: string;
  reminder_name: string;
  reminder_emoji: string | null;
  scheduled_for: string;
  local_date: string;
  notify_count: number;
  snooze_minutes: number;
}

interface SubRow {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  enabled: boolean;
  failure_count: number;
}

let appServerPromise: Promise<webpush.ApplicationServer> | null = null;
function getAppServer(): Promise<webpush.ApplicationServer> {
  if (!appServerPromise) {
    appServerPromise = (async () => {
      const vapidKeys = await webpush.importVapidKeys(
        JSON.parse(VAPID_KEYS_JSON),
        { extractable: false },
      );
      return await webpush.ApplicationServer.new({
        contactInformation: VAPID_SUBJECT,
        vapidKeys,
      });
    })();
  }
  return appServerPromise;
}

async function hmacToken(occurrenceId: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(ACTION_TOKEN_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(occurrenceId),
  );
  return btoa(String.fromCharCode(...new Uint8Array(mac)))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function localTimeLabel(iso: string, timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: timezone,
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

interface PushResult {
  ok: boolean;
  status: number | null;
  gone: boolean;
  error: string | null;
}

async function sendPush(sub: SubRow, payload: unknown): Promise<PushResult> {
  const appServer = await getAppServer();
  const subscriber = appServer.subscribe({
    endpoint: sub.endpoint,
    keys: { p256dh: sub.p256dh, auth: sub.auth },
  });
  try {
    await subscriber.pushTextMessage(JSON.stringify(payload), {
      ttl: 3600,
      urgency: webpush.Urgency.Normal,
    });
    return { ok: true, status: 201, gone: false, error: null };
  } catch (err) {
    if (err instanceof webpush.PushMessageError) {
      const status = err.response?.status ?? null;
      return {
        ok: false,
        status,
        gone: status === 404 || status === 410,
        error: `push service responded ${status}`,
      };
    }
    return {
      ok: false,
      status: null,
      gone: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function recordResult(
  supabase: ReturnType<typeof createClient>,
  sub: SubRow,
  result: PushResult,
  occurrenceId: string | null,
) {
  if (occurrenceId) {
    await supabase.from("notification_deliveries").insert({
      user_id: sub.user_id,
      occurrence_id: occurrenceId,
      subscription_id: sub.id,
      status: result.ok ? "sent" : "failed",
      http_status: result.status,
      error: result.error,
    });
  }
  if (result.ok) {
    await supabase
      .from("push_subscriptions")
      .update({ last_success_at: new Date().toISOString(), failure_count: 0 })
      .eq("id", sub.id);
  } else {
    const failures = sub.failure_count + 1;
    await supabase
      .from("push_subscriptions")
      .update({
        failure_count: failures,
        last_error: result.error,
        // a dead endpoint or five straight failures disables the device;
        // re-enabling from settings resets the count
        enabled: !(result.gone || failures >= 5),
      })
      .eq("id", sub.id);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  const cronSecret = req.headers.get("x-cron-secret");
  const isCron = CRON_SECRET !== "" && cronSecret === CRON_SECRET;

  if (!isCron) {
    // test mode: requires a valid user JWT
    const authHeader = req.headers.get("authorization") ?? "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    const { data: userData, error: userError } = await supabase.auth.getUser(
      jwt,
    );
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("id, user_id, endpoint, p256dh, auth, enabled, failure_count")
      .eq("user_id", userData.user.id)
      .eq("enabled", true);

    let sent = 0;
    for (const sub of (subs ?? []) as SubRow[]) {
      const result = await sendPush(sub, {
        title: "Coach Greta",
        body: "Test notification, everything works",
        tag: "test",
      });
      await recordResult(supabase, sub, result, null);
      if (result.ok) sent++;
    }
    return new Response(JSON.stringify({ sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // cron mode: claim and deliver
  const { data: claimed, error: claimError } = await supabase.rpc(
    "claim_due_notifications",
    { p_now: new Date().toISOString() },
  );
  if (claimError) {
    return new Response(JSON.stringify({ error: claimError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const rows = (claimed ?? []) as Claimed[];
  if (rows.length === 0) {
    return new Response(JSON.stringify({ claimed: 0, sent: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const [{ data: subs }, { data: profiles }] = await Promise.all([
    supabase
      .from("push_subscriptions")
      .select("id, user_id, endpoint, p256dh, auth, enabled, failure_count")
      .in("user_id", userIds)
      .eq("enabled", true),
    supabase.from("profiles").select("id, timezone").in("id", userIds),
  ]);

  const tzByUser = new Map(
    ((profiles ?? []) as { id: string; timezone: string }[]).map((p) => [
      p.id,
      p.timezone,
    ]),
  );
  const subsByUser = new Map<string, SubRow[]>();
  for (const sub of (subs ?? []) as SubRow[]) {
    const list = subsByUser.get(sub.user_id) ?? [];
    list.push(sub);
    subsByUser.set(sub.user_id, list);
  }

  let sent = 0;
  let failed = 0;
  for (const row of rows) {
    const timeLabel = localTimeLabel(
      row.scheduled_for,
      tzByUser.get(row.user_id) ?? "UTC",
    );
    const payload = {
      title: `${row.reminder_emoji ? row.reminder_emoji + " " : ""}${row.reminder_name}`,
      body:
        row.notify_count > 1
          ? `Still pending, scheduled for ${timeLabel}`
          : `Scheduled for ${timeLabel}`,
      occurrenceId: row.occurrence_id,
      tag: `reminder-${row.reminder_id}`,
      actionUrl: `${SUPABASE_URL}/functions/v1/notification-action`,
      actionToken: await hmacToken(row.occurrence_id),
      snoozeMinutes: row.snooze_minutes,
    };

    for (const sub of subsByUser.get(row.user_id) ?? []) {
      const result = await sendPush(sub, payload);
      await recordResult(supabase, sub, result, row.occurrence_id);
      if (result.ok) sent++;
      else failed++;
    }
  }

  return new Response(JSON.stringify({ claimed: rows.length, sent, failed }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
