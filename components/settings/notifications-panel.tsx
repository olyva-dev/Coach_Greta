"use client";

import {
  useEffect,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import { BellRing, Send, Trash2 } from "lucide-react";
import {
  removeSubscription,
  saveSubscription,
  setSubscriptionEnabled,
} from "@/app/actions/push";
import {
  currentEndpoint,
  detectPushSupport,
  subscribeThisDevice,
  unsubscribeThisDevice,
  type PushSupport,
} from "@/lib/push/subscribe";
import { createClient } from "@/lib/supabase/client";
import type { PushSubscriptionRow } from "@/lib/db/types";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function emptySubscribe() {
  return () => {};
}

export function NotificationsPanel({
  subscriptions,
}: {
  subscriptions: PushSubscriptionRow[];
}) {
  const [pending, startTransition] = useTransition();
  const [thisEndpoint, setThisEndpoint] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // client only probe, "unsupported" during SSR
  const support = useSyncExternalStore(
    emptySubscribe,
    detectPushSupport,
    (): PushSupport => "unsupported"
  );

  useEffect(() => {
    let alive = true;
    currentEndpoint()
      .then((e) => {
        if (alive) setThisEndpoint(e);
      })
      .catch(() => null);
    return () => {
      alive = false;
    };
  }, []);

  const thisDeviceSubscribed =
    thisEndpoint !== null &&
    subscriptions.some((s) => s.endpoint === thisEndpoint);

  function enable() {
    setMessage(null);
    startTransition(async () => {
      try {
        const payload = await subscribeThisDevice();
        await saveSubscription(payload);
        setThisEndpoint(payload.endpoint);
        setMessage("Notifications enabled on this device");
      } catch (err) {
        setMessage(
          err instanceof Error ? err.message : "Could not enable notifications"
        );
      }
    });
  }

  function disable() {
    setMessage(null);
    startTransition(async () => {
      try {
        const endpoint = await unsubscribeThisDevice();
        if (endpoint) await removeSubscription(endpoint);
        setThisEndpoint(null);
        setMessage("Notifications disabled on this device");
      } catch {
        setMessage("Could not disable notifications");
      }
    });
  }

  function sendTest() {
    setMessage(null);
    startTransition(async () => {
      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) throw new Error("Not signed in");
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-due-reminders`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ test: true }),
          }
        );
        const body = await res.json().catch(() => ({}));
        setMessage(
          res.ok
            ? `Test sent to ${body.sent ?? 0} device(s)`
            : "Test push failed, check the Edge Function logs"
        );
      } catch {
        setMessage("Test push failed, is the Edge Function deployed?");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BellRing className="size-4 text-primary" /> Notifications
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {support === "needs-install" && (
          <div className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2.5 text-sm">
            To get notifications on iPhone, first add this app to your home
            screen: tap the share button in Safari, then &quot;Add to Home
            Screen&quot;, and open it from there.
          </div>
        )}

        {support === "supported" && !thisDeviceSubscribed && (
          <Button onClick={enable} disabled={pending}>
            Enable notifications on this device
          </Button>
        )}
        {support === "supported" && thisDeviceSubscribed && (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={sendTest} disabled={pending}>
              <Send /> Send test push
            </Button>
            <Button variant="ghost" onClick={disable} disabled={pending}>
              Disable on this device
            </Button>
          </div>
        )}

        {subscriptions.length > 0 && (
          <div className="flex flex-col divide-y divide-border rounded-md border border-border">
            {subscriptions.map((s) => (
              <div key={s.id} className="flex items-center gap-3 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {s.device_label ?? "Unknown device"}
                    {s.endpoint === thisEndpoint && (
                      <span className="ml-2 text-xs text-primary">
                        this device
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {s.last_success_at
                      ? `last push ${new Date(s.last_success_at).toLocaleString()}`
                      : "no pushes yet"}
                    {s.failure_count > 0 && ` · ${s.failure_count} failures`}
                  </p>
                </div>
                <Switch
                  checked={s.enabled}
                  onCheckedChange={(v) =>
                    startTransition(async () => {
                      await setSubscriptionEnabled(s.id, v);
                    })
                  }
                />
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Remove device"
                  onClick={() =>
                    startTransition(async () => {
                      await removeSubscription(s.endpoint);
                    })
                  }
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
          </div>
        )}

        {message && <p className="text-sm text-muted-foreground">{message}</p>}
      </CardContent>
    </Card>
  );
}
