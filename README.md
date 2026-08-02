# Coach Greta

Personal health habit tracker and reminder engine. Single user, installable
PWA, dark mode, built on Next.js and Supabase and running entirely within
their free tiers.

Three kinds of items, all managed from inside the app:

* **Reminders**: scheduled push notifications, at fixed times or every X
  minutes inside a window, with a per reminder retry policy (once, one
  follow up, or keep reminding).
* **Challenges**: progressive daily targets where the amount depends on the
  day number (day 2 is 2 squats, day 15 is 15). Linear, fixed or custom
  ladders, calendar based so pausing never shifts the target.
* **Habits**: a daily yes/no checklist. A habit is either a goal ("gym") or
  something to avoid ("sugar"): avoid habits count as a win when you never
  check them.

Reminders fire even when the app is closed on every device: pg_cron inside
Supabase calls an Edge Function every minute, which claims due occurrences
in one atomic step and pushes an encrypted Web Push message to every
subscribed device.

```
pg_cron (every min) ──► Edge Fn send-due-reminders ──► Apple / Google push ──► sw.js
pg_cron (every 15m) ──► maintain_schedules()  [pure SQL scheduling brain]
Next.js on Vercel  ◄──► Supabase Postgres (RLS)          sw.js ──► Edge Fn notification-action
```

## Repository layout

```
app/                    Next.js App Router (Today, Progress, Manage, Settings)
components/             UI primitives and feature components
lib/domain/             pure scheduling / progression / streak logic (unit tested)
lib/supabase/           browser and server clients
proxy.ts                session refresh + auth + MFA gate (Next 16 middleware)
public/sw.js            service worker: push, actions, offline fallback
supabase/migrations/    plain Postgres schema, RLS, engine; one platform file
supabase/functions/     Deno Edge Functions (delivery + notification actions)
scripts/                VAPID key and icon generators
```

## Deploy from scratch

You need: a Supabase account, a Vercel account, Node 20+, and the
[Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started).

### 1. Create the Supabase project

1. Dashboard → new project in your **personal** organization. Pick a strong
   database password and the region closest to you.
2. Note the project ref (the subdomain of your project URL) and, under
   Settings → API keys, the `sb_publishable_...` and `sb_secret_...` keys.

### 2. Apply migrations

```bash
supabase login
supabase link --project-ref <project-ref>
supabase db push
```

This creates the schema, RLS policies, the reminder engine, enables
`pg_cron` and `pg_net`, and registers two cron jobs:

* `coach-greta-maintain` every 15 minutes: materialises upcoming reminder
  occurrences and closes out missed ones
* `coach-greta-send-due` every minute: calls the delivery Edge Function

### 3. Store the cron secrets in Vault

The per minute job reads its target URL and secret from Supabase Vault at
run time. In the SQL editor:

```sql
select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
select vault.create_secret('<long random string>', 'cron_secret');
```

Generate the random string with `openssl rand -base64 32`. Keep it, you
need the same value in step 5.

### 4. Generate VAPID keys

```bash
node scripts/generate-vapid-keys.mjs
```

Copy the two outputs somewhere safe. The keys must never change once
devices are subscribed, or every subscription breaks.

### 5. Deploy the Edge Functions

```bash
supabase secrets set \
  SERVICE_KEY='sb_secret_...' \
  CRON_SECRET='<same value as the cron_secret vault entry>' \
  ACTION_TOKEN_SECRET="$(openssl rand -base64 32)" \
  VAPID_KEYS_JSON='<from step 4, the single line JSON>' \
  VAPID_SUBJECT='mailto:you@example.com'

supabase functions deploy send-due-reminders
supabase functions deploy notification-action
```

`supabase/config.toml` already sets `verify_jwt = false` for both: the
first authenticates with the cron secret (or a user JWT for test pushes),
the second with a per notification HMAC token.

### 6. Create your user and lock signup down

1. Dashboard → Authentication → Sign In / Providers: **disable** "Allow new
   users to sign up". Email/password stays enabled.
2. Authentication → Users → Add user → create your email and password, and
   tick auto confirm.
3. A profile row is created automatically. Optional but recommended: load
   the example content. SQL editor:

```sql
select public.seed_examples('<your-user-uuid from the Users list>');
```

### 7. Deploy to Vercel

1. Push this repository to GitHub and import it in Vercel under your
   personal account. Framework preset: Next.js, no special build settings.
2. Environment variables (all three are public by design, the app holds no
   privileged key):

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | from step 4 |

3. Deploy. Sign in, go to Settings, and set up two factor authentication
   (recommended: this is health data).

### 8. Install the PWA and enable push

* **Chrome on macOS** (Mac mini / MacBook Pro): open the app → address bar
  install icon → Install. Then in the app: Settings → Enable notifications
  on this device → allow.
* **Safari on macOS**: File → Add to Dock. Open from the Dock, then enable
  notifications in Settings.
* **iPhone (iOS 16.4+)**: open the site in Safari → share button → **Add to
  Home Screen** → open it *from the home screen* → Settings → Enable
  notifications. iOS only allows web push for installed home screen apps;
  the app detects a plain Safari tab and shows these instructions instead
  of a broken button.

Finish with Settings → Send test push on each device.

## Daily semantics worth knowing

* **Avoid habits** ("did I eat sugar"): an untouched day counts as a win,
  you only tap when you slipped. Turn on "require a daily confirmation" per
  habit to make silence break the streak instead.
* **Challenge day numbers are calendar based**: day = date minus start date
  plus one. Pausing hides a challenge from Today but never shifts the ladder.
* **Missed**: a reminder occurrence you never touched is marked missed at
  the first maintenance tick after your local midnight.
* **Quiet hours** (Settings) delay reminder pushes to the end of the
  window rather than dropping them.
* **Notification buttons**: Chrome shows Done and Snooze directly on the
  notification. Safari (macOS and iOS) does not support notification
  action buttons, so there a tap opens Today focused on the item, one tap
  from done.

## Local development

```bash
npm install
cp .env.example .env.local          # fill in your values
supabase start                      # local stack, applies migrations + seed
npm run dev
```

The local seed creates `dev@local.test` / `password123` with the example
content. `npm run test` runs the domain unit tests, `npm run typecheck` and
`npm run lint` the static checks.

Web push needs HTTPS except on localhost; Chrome treats localhost as
secure, so the full subscribe flow is testable in local dev.

## Free tier notes

* The per minute delivery call is about 44k Edge Function invocations per
  month, against a free allowance of 500k, and it doubles as activity that
  keeps the free project from pausing for inactivity. If the project does
  get paused (for example after a long billing lapse), unpause it and the
  cron jobs resume automatically with the database.
* Everything else (auth, database size, bandwidth) is far below the limits
  for single user use.

## Troubleshooting push

1. Settings → Send test push. If it fails, check the Edge Function logs in
   the dashboard (Functions → send-due-reminders → Logs).
2. `net.http_post` failures are silent from cron's point of view. Inspect
   the response log:

```sql
select created, status_code, error_msg
from net._http_response order by created desc limit 20;
```

3. Check the cron jobs ran: `select * from cron.job_run_details order by
   start_time desc limit 20;`
4. Delivery history per notification lives in `notification_deliveries`.
   A subscription that returns 404/410 (uninstalled PWA, revoked
   permission) is disabled automatically; re-enable the device from
   Settings after reinstalling.
5. On iPhone, deleting the home screen app kills its push subscription:
   reinstall and enable notifications again.

## Portability

The schema and engine are plain Postgres. To move to self hosted Postgres
later:

* replace the body of `public.current_app_user_id()` (it wraps
  `auth.uid()`) with whatever identifies you there
* replace `supabase/migrations/20260802190004_platform_supabase.sql` (the
  only Supabase coupled file: the auth.users trigger, pg_net and Vault
  wiring) with a systemd timer or cron calling the same two entry points:
  `select public.maintain_schedules();` every 15 minutes and the delivery
  endpoint every minute
* host the two Deno functions anywhere Deno runs, or port them to Node
  with the `web-push` npm package; the SQL contract is just
  `claim_due_notifications(now())` and `apply_notification_action(id, action)`
