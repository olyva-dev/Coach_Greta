// Generates a VAPID key pair for web push. Run once:
//   node scripts/generate-vapid-keys.mjs
//
// Two values come out and they go to two different places. Getting them
// the wrong way round is the usual mistake, so the output spells it out.
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

const keysJson = JSON.stringify({
  publicKey: publicJwk,
  privateKey: privateJwk,
});

const line = "─".repeat(72);

console.log(`
${line}
 VAPID keys generated. Store them now, they must never change: rotating
 them invalidates every device already subscribed.
${line}

 1. SUPABASE  (contains the PRIVATE key, must never reach the browser)

    Run this in your terminal. Keep the single quotes: they are shell
    syntax that the shell strips, and without them the JSON breaks on its
    own double quotes.

supabase secrets set VAPID_KEYS_JSON='${keysJson}'

    Pasting into the Supabase dashboard instead? Then drop the outer
    quotes and paste the raw JSON, from the { to the }.

${line}

 2. VERCEL  (public, safe in the browser)

    Environment variable, one line, no quotes:

NEXT_PUBLIC_VAPID_PUBLIC_KEY=${publicB64url}

    NEXT_PUBLIC_* values are baked in at build time, so redeploy after
    setting it or nothing changes.

${line}

 Never put the JSON from step 1 into a NEXT_PUBLIC_ variable. That would
 publish the private key to every visitor.
${line}
`);
