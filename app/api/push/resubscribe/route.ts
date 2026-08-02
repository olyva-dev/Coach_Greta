import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Called by the service worker's pushsubscriptionchange handler. Cookie
// authenticated: if the session has lapsed the SW retry fails silently and
// the app repairs the subscription on next open instead.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const body = (await request.json()) as {
    oldEndpoint: string | null;
    subscription: {
      endpoint?: string;
      keys?: { p256dh?: string; auth?: string };
    };
  };

  const sub = body.subscription;
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (body.oldEndpoint && body.oldEndpoint !== sub.endpoint) {
    await supabase
      .from("push_subscriptions")
      .delete()
      .eq("endpoint", body.oldEndpoint);
  }

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
      enabled: true,
      failure_count: 0,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" }
  );
  if (error) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
