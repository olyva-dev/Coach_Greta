"use client";

// Browser side push subscription helpers

export type PushSupport =
  | "supported"
  | "needs-install" // iOS Safari in a tab: must be added to the home screen first
  | "unsupported";

export function detectPushSupport(): PushSupport {
  if (typeof window === "undefined") return "unsupported";
  const hasApis =
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;

  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari specific
    (navigator as unknown as { standalone?: boolean }).standalone === true;

  if (isIOS && !standalone) return "needs-install";
  return hasApis ? "supported" : "unsupported";
}

export function deviceLabelFromUserAgent(): string {
  const ua = navigator.userAgent;
  const browser = /CriOS|Chrome/.test(ua)
    ? "Chrome"
    : /Safari/.test(ua)
      ? "Safari"
      : /Firefox|FxiOS/.test(ua)
        ? "Firefox"
        : "Browser";
  const device = /iPhone/.test(ua)
    ? "iPhone"
    : /iPad/.test(ua)
      ? "iPad"
      : /Macintosh/.test(ua)
        ? "Mac"
        : /Windows/.test(ua)
          ? "Windows"
          : "device";
  return `${browser} on ${device}`;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

export interface SubscriptionPayload {
  endpoint: string;
  p256dh: string;
  auth: string;
  deviceLabel: string;
  userAgent: string;
}

export async function subscribeThisDevice(): Promise<SubscriptionPayload> {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Notification permission was not granted");
  }

  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
      ) as BufferSource,
    }));

  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error("Subscription is missing keys");
  }

  return {
    endpoint: json.endpoint,
    p256dh: json.keys.p256dh,
    auth: json.keys.auth,
    deviceLabel: deviceLabelFromUserAgent(),
    userAgent: navigator.userAgent,
  };
}

export async function unsubscribeThisDevice(): Promise<string | null> {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return null;
  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  return endpoint;
}

export async function currentEndpoint(): Promise<string | null> {
  if (!("serviceWorker" in navigator)) return null;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  return subscription?.endpoint ?? null;
}
