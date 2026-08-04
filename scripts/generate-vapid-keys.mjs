// Generates the VAPID key pair and every random secret the Edge Functions
// need, then writes them to an env file so nothing large has to survive a
// copy paste into a shell.
//
//   node scripts/generate-vapid-keys.mjs
//   supabase secrets set --env-file supabase/.env.secrets
//
// Run once. Rotating these invalidates every device already subscribed.
import { webcrypto, randomBytes } from "node:crypto";
import { writeFile, mkdir, readFile } from "node:fs/promises";

const { subtle } = webcrypto;
const OUT = "supabase/.env.secrets";

const keyPair = await subtle.generateKey(
  { name: "ECDSA", namedCurve: "P-256" },
  true,
  ["sign", "verify"]
);

const keysJson = JSON.stringify({
  publicKey: await subtle.exportKey("jwk", keyPair.publicKey),
  privateKey: await subtle.exportKey("jwk", keyPair.privateKey),
});

// raw uncompressed public key, base64url: what PushManager.subscribe wants
const raw = new Uint8Array(await subtle.exportKey("raw", keyPair.publicKey));
const publicB64url = Buffer.from(raw).toString("base64url");

const cronSecret = randomBytes(32).toString("base64url");
const actionSecret = randomBytes(32).toString("base64url");

// keep whatever the user already filled in for the two values this script
// cannot invent
let serviceKey = "PASTE_YOUR_sb_secret_KEY_HERE";
let subject = "mailto:you@example.com";
try {
  const existing = await readFile(OUT, "utf8");
  const keep = (name, fallback) =>
    existing.match(new RegExp(`^${name}=(.*)$`, "m"))?.[1] || fallback;
  serviceKey = keep("SERVICE_KEY", serviceKey);
  subject = keep("VAPID_SUBJECT", subject);
} catch {
  // no previous file, use the placeholders
}

await mkdir("supabase", { recursive: true });
await writeFile(
  OUT,
  `# Edge Function secrets. Contains the VAPID PRIVATE key.
# Gitignored by the .env* rule. Delete it once the secrets are set.
# Apply with: supabase secrets set --env-file ${OUT}
SERVICE_KEY=${serviceKey}
VAPID_SUBJECT=${subject}
VAPID_KEYS_JSON=${keysJson}
CRON_SECRET=${cronSecret}
ACTION_TOKEN_SECRET=${actionSecret}
`
);

const line = "─".repeat(70);

console.log(`
${line}
 Wrote ${OUT}
${line}

 1. Open it and replace SERVICE_KEY with your sb_secret_... key from the
    Supabase dashboard (Settings, API keys). Set VAPID_SUBJECT to your
    email if you want. Then apply everything with one command:

      supabase secrets set --env-file ${OUT}
      supabase functions deploy send-due-reminders
      supabase functions deploy notification-action

 2. Supabase SQL editor, so the cron job can call the function. The
    secret below must match the one in the file:

      select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
      select vault.create_secret('${cronSecret}', 'cron_secret');

 3. Vercel environment variable. One line, no quotes. NEXT_PUBLIC_ values
    are baked in at build time, so redeploy afterwards:

      NEXT_PUBLIC_VAPID_PUBLIC_KEY=${publicB64url}

${line}
 Only the value in step 3 is public. The file holds the private key:
 never put its contents in a NEXT_PUBLIC_ variable, and delete it once
 the secrets are set.
${line}
`);
