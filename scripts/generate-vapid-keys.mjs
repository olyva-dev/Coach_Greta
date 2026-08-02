// Generates a VAPID key pair for web push. Run once: node scripts/generate-vapid-keys.mjs
// Prints:
//   * VAPID_KEYS_JSON     -> supabase secrets set (Edge Functions)
//   * NEXT_PUBLIC_VAPID_PUBLIC_KEY -> Vercel env (browser subscription)
// The JWK export matches what @negrel/webpush importVapidKeys expects.
import { webcrypto } from "node:crypto";

const { subtle } = webcrypto;

const keyPair = await subtle.generateKey(
  { name: "ECDSA", namedCurve: "P-256" },
  true,
  ["sign", "verify"]
);

const publicJwk = await subtle.exportKey("jwk", keyPair.publicKey);
const privateJwk = await subtle.exportKey("jwk", keyPair.privateKey);

// raw uncompressed public key, base64url: what PushManager.subscribe wants
const raw = new Uint8Array(await subtle.exportKey("raw", keyPair.publicKey));
const publicB64url = Buffer.from(raw).toString("base64url");

console.log("VAPID keys generated. Store these once, they must not change.\n");
console.log("1. Edge Function secret (single line):\n");
console.log(
  `VAPID_KEYS_JSON='${JSON.stringify({ publicKey: publicJwk, privateKey: privateJwk })}'`
);
console.log("\n2. Vercel / .env.local public key:\n");
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${publicB64url}`);
