/* Coach Greta service worker: push delivery, notification actions and a
 * minimal offline fallback. No precache framework on purpose, the app is
 * online first and only /offline is cached. */

const CACHE = "greta-v1";
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.add(OFFLINE_URL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

// network first, offline fallback for navigations only
self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(OFFLINE_URL).then((r) => r ?? Response.error())
    )
  );
});

/* Push payload shape (see the send-due-reminders Edge Function):
 * { title, body, occurrenceId, tag, actionUrl, actionToken, snoozeMinutes } */
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: "Coach Greta", body: "Something is due" };
  }

  const title = payload.title || "Coach Greta";
  const options = {
    body: payload.body || "",
    tag: payload.tag || "coach-greta",
    renotify: false,
    requireInteraction: false,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: {
      occurrenceId: payload.occurrenceId,
      actionUrl: payload.actionUrl,
      actionToken: payload.actionToken,
      snoozeMinutes: payload.snoozeMinutes,
    },
  };

  // Chrome shows action buttons, Safari reports maxActions 0 and ignores them
  if (
    typeof Notification !== "undefined" &&
    Notification.maxActions &&
    Notification.maxActions >= 2
  ) {
    options.actions = [
      { action: "done", title: "Done" },
      { action: "snooze", title: "Snooze" },
    ];
  }

  event.waitUntil(self.registration.showNotification(title, options));
});

async function sendAction(data, action) {
  if (!data || !data.actionUrl || !data.actionToken) return false;
  try {
    const res = await fetch(data.actionUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        occurrenceId: data.occurrenceId,
        action,
        token: data.actionToken,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function focusOrOpen(url) {
  const clientList = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });
  for (const client of clientList) {
    if ("focus" in client) {
      await client.focus();
      if ("navigate" in client) {
        try {
          await client.navigate(url);
        } catch {
          /* cross origin or dead client, fall through */
        }
      }
      return;
    }
  }
  await self.clients.openWindow(url);
}

self.addEventListener("notificationclick", (event) => {
  const data = event.notification.data || {};

  if (event.action === "done" || event.action === "snooze") {
    // handled in the background, the app does not need to open
    event.notification.close();
    event.waitUntil(sendAction(data, event.action));
    return;
  }

  // plain tap: open the app focused on this occurrence
  event.notification.close();
  const url = data.occurrenceId
    ? `/today?focus=${encodeURIComponent(data.occurrenceId)}`
    : "/today";
  event.waitUntil(focusOrOpen(url));
});

// keep the server subscription in sync if the push service rotates it
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const subscription = await self.registration.pushManager.subscribe(
          event.oldSubscription
            ? event.oldSubscription.options
            : { userVisibleOnly: true }
        );
        await fetch("/api/push/resubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            oldEndpoint: event.oldSubscription
              ? event.oldSubscription.endpoint
              : null,
            subscription: subscription.toJSON(),
          }),
        });
      } catch {
        /* the app repairs the subscription on next open */
      }
    })()
  );
});
