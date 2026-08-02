-- Coach Greta: core schema
-- Plain Postgres only. The single Supabase coupling in the whole schema is
-- auth.uid(), wrapped in public.current_app_user_id() (see the RLS migration).

create extension if not exists pgcrypto;

-- Shared trigger to keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles: one row per user, owns timezone and notification preferences
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key,
  timezone text not null default 'America/Bogota',
  quiet_hours_start time,
  quiet_hours_end time,
  week_starts_on smallint not null default 1 check (week_starts_on in (0, 1)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- reminders: recurring things that push notifications
-- days_of_week uses extract(dow) convention: 0 = Sunday .. 6 = Saturday
-- ---------------------------------------------------------------------------
create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  emoji text,
  notes text,
  schedule_kind text not null check (schedule_kind in ('fixed_times', 'interval')),
  times time[],
  interval_minutes int check (interval_minutes >= 5),
  window_start time,
  window_end time,
  days_of_week smallint[] not null default '{0,1,2,3,4,5,6}',
  retry_policy text not null default 'once'
    check (retry_policy in ('once', 'one_retry', 'repeat')),
  retry_interval_minutes int not null default 15 check (retry_interval_minutes >= 5),
  max_retries int not null default 3 check (max_retries between 1 and 20),
  snooze_minutes int not null default 10 check (snooze_minutes >= 5),
  status text not null default 'active'
    check (status in ('active', 'paused', 'archived')),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reminders_schedule_shape check (
    (schedule_kind = 'fixed_times'
      and times is not null and cardinality(times) >= 1)
    or
    (schedule_kind = 'interval'
      and interval_minutes is not null
      and window_start is not null
      and window_end is not null
      and window_start < window_end)
  )
);

create index reminders_user_status_idx on public.reminders (user_id, status);

create trigger reminders_updated_at
  before update on public.reminders
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- reminder_occurrences: materialised instances, the unit of delivery and history
-- notify_after is the delivery cursor: null means never (or no longer) push
-- ---------------------------------------------------------------------------
create table public.reminder_occurrences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  reminder_id uuid not null references public.reminders (id) on delete cascade,
  local_date date not null,
  scheduled_for timestamptz not null,
  notify_after timestamptz,
  notify_count int not null default 0,
  last_notified_at timestamptz,
  status text not null default 'pending'
    check (status in ('pending', 'notified', 'snoozed', 'done', 'skipped', 'missed')),
  completed_at timestamptz,
  unique (reminder_id, scheduled_for)
);

create index reminder_occurrences_user_date_idx
  on public.reminder_occurrences (user_id, local_date);
create index reminder_occurrences_due_idx
  on public.reminder_occurrences (notify_after)
  where notify_after is not null;

-- ---------------------------------------------------------------------------
-- challenges: progressive daily targets, day number is calendar based
-- ---------------------------------------------------------------------------
create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  exercises text[] not null check (cardinality(exercises) >= 1),
  unit text not null default 'reps',
  start_date date not null,
  duration_days int not null check (duration_days between 1 and 3650),
  progression_kind text not null
    check (progression_kind in ('linear', 'fixed', 'custom')),
  start_amount int,
  increment int not null default 0,
  max_amount int,
  custom_amounts int[],
  rest_days smallint[] not null default '{}',
  status text not null default 'active'
    check (status in ('active', 'paused', 'archived')),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint challenges_progression_shape check (
    (progression_kind in ('linear', 'fixed') and start_amount is not null)
    or
    (progression_kind = 'custom'
      and custom_amounts is not null and cardinality(custom_amounts) >= 1)
  )
);

create index challenges_user_status_idx on public.challenges (user_id, status);

create trigger challenges_updated_at
  before update on public.challenges
  for each row execute function public.set_updated_at();

create table public.challenge_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  local_date date not null,
  day_number int not null,
  target_amount int not null,
  status text not null check (status in ('done', 'partial', 'skipped')),
  completed_amount int,
  note text,
  created_at timestamptz not null default now(),
  unique (challenge_id, local_date)
);

create index challenge_logs_user_date_idx
  on public.challenge_logs (user_id, local_date);

-- ---------------------------------------------------------------------------
-- habits: daily yes/no checklist
-- polarity 'negative' means the habit is something to avoid: an unchecked
-- day counts as a win unless require_explicit_check is set
-- ---------------------------------------------------------------------------
create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  emoji text,
  polarity text not null check (polarity in ('positive', 'negative')),
  days_of_week smallint[] not null default '{0,1,2,3,4,5,6}',
  require_explicit_check boolean not null default false,
  status text not null default 'active'
    check (status in ('active', 'paused', 'archived')),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index habits_user_status_idx on public.habits (user_id, status);

create trigger habits_updated_at
  before update on public.habits
  for each row execute function public.set_updated_at();

create table public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  habit_id uuid not null references public.habits (id) on delete cascade,
  local_date date not null,
  value boolean not null,
  logged_at timestamptz not null default now(),
  unique (habit_id, local_date)
);

create index habit_logs_user_date_idx on public.habit_logs (user_id, local_date);

-- ---------------------------------------------------------------------------
-- push delivery
-- ---------------------------------------------------------------------------
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  device_label text,
  user_agent text,
  enabled boolean not null default true,
  failure_count int not null default 0,
  last_success_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz
);

create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

create table public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  occurrence_id uuid not null
    references public.reminder_occurrences (id) on delete cascade,
  subscription_id uuid
    references public.push_subscriptions (id) on delete set null,
  status text not null check (status in ('sent', 'failed')),
  http_status int,
  error text,
  sent_at timestamptz not null default now()
);

create index notification_deliveries_user_sent_idx
  on public.notification_deliveries (user_id, sent_at desc);
create index notification_deliveries_occurrence_idx
  on public.notification_deliveries (occurrence_id);
