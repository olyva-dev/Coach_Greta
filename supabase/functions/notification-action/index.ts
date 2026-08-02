// Coach Greta: notification action Edge Function.
// Called by the service worker when the user taps Done or Snooze on a push
// notification. Authenticated by a per occurrence HMAC token that was
// delivered inside the encrypted push payload, so no session token ever
// lives in the service worker. Deployed with verify_jwt = false.

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY =
  Deno.env.get("SERVICE_KEY") ??
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
  "";
const ACTION_TOKEN_SECRET = Deno.env.get("ACTION_TOKEN_SECRET") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function expectedToken(occurrenceId: string): Promise<string> {
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

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "method not allowed" }, 405);
  }
  if (ACTION_TOKEN_SECRET === "") {
    return json({ error: "ACTION_TOKEN_SECRET not configured" }, 500);
  }

  let body: { occurrenceId?: string; action?: string; token?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }

  const { occurrenceId, action, token } = body;
  if (!occurrenceId || !token || (action !== "done" && action !== "snooze")) {
    return json({ error: "bad request" }, 400);
  }

  const expected = await expectedToken(occurrenceId);
  if (!timingSafeEqual(expected, token)) {
    return json({ error: "invalid token" }, 403);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });
  const { error } = await supabase.rpc("apply_notification_action", {
    p_occurrence_id: occurrenceId,
    p_action: action,
  });
  if (error) {
    return json({ error: error.message }, 500);
  }
  return json({ ok: true });
});
