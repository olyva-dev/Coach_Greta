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

// A VAPID application server key is a P-256 public key in uncompressed
// form: 65 bytes, which is 87 base64url characters. Validate before
// decoding, because a bare atob failure ("string not correctly encoded")
// says nothing about which value is wrong or where it lives.
const VAPID_KEY_BYTES = 65;

export function vapidKeyProblem(raw: string | undefined): string | null {
  const key = (raw ?? "").trim();
  if (key === "") {
    return "NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set on this deployment.";
  }
  if (key.startsWith("{")) {
    return "NEXT_PUBLIC_VAPID_PUBLIC_KEY holds the JSON key pair. It needs the single line public key instead, the second value printed by scripts/generate-vapid-keys.mjs.";
  }
  if (!/^[A-Za-z0-9\-_]+$/.test(key)) {
    return "NEXT_PUBLIC_VAPID_PUBLIC_KEY contains characters that are not base64url. Check for quotes, spaces or a trailing newline.";
  }
  if (key.length < 80 || key.length > 90) {
    return `NEXT_PUBLIC_VAPID_PUBLIC_KEY is ${key.length} characters, expected about 87. It looks like the wrong value was pasted.`;
  }
  return null;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const key = base64String.trim();
  const padding = "=".repeat((4 - (key.length % 4)) % 4);
  const base64 = (key + padding).replace(/-/g, "+").replace(/_/g, "/");

  let raw: string;
  try {
    raw = window.atob(base64);
  } catch {
    throw new Error(
      "NEXT_PUBLIC_VAPID_PUBLIC_KEY is not valid base64url. Regenerate it with scripts/generate-vapid-keys.mjs and set it in Vercel."
    );
  }

  if (raw.length !== VAPID_KEY_BYTES) {
    throw new Error(
      `NEXT_PUBLIC_VAPID_PUBLIC_KEY decoded to ${raw.length} bytes, expected ${VAPID_KEY_BYTES}. This is not a VAPID public key.`
    );
  }

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
