-- Coach Greta: guided exercise modules
--
-- Some items are not "did you do it yes/no", they are a guided session with
-- phases, reps and sets (Kegel today, breathing next). Protocol definitions
-- live in code, not here: they are medical content that should be versioned
-- and reviewed with the app, not edited at runtime. What belongs in the
-- database is what actually happened.

create table public.exercise_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  module_key text not null,
  level_key text not null,
  local_date date not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null default 'in_progress'
    check (status in ('in_progress', 'completed', 'abandoned')),
  reps_completed int not null default 0,
  reps_target int not null,
  sets_completed int not null default 0,
  sets_target int not null,
  duration_seconds int not null default 0,
  -- the occurrence this session closes out, when started from a reminder
  occurrence_id uuid references public.reminder_occurrences (id) on delete set null
);

create index exercise_sessions_user_date_idx
  on public.exercise_sessions (user_id, local_date desc);
create index exercise_sessions_module_idx
  on public.exercise_sessions (user_id, module_key, local_date desc);

alter table public.exercise_sessions enable row level security;

create policy exercise_sessions_owner on public.exercise_sessions
  for all to authenticated
  using (user_id = public.current_app_user_id())
  with check (user_id = public.current_app_user_id());

-- A reminder can point at a guided module. When set, tapping the reminder
-- opens the module instead of just marking it done, and finishing a session
-- closes the occurrence.
alter table public.reminders
  add column module_key text;

-- existing reminders that now have a guided module behind them
update public.reminders
set module_key = 'kegel'
where name = 'Kegel exercises' and module_key is null;

update public.reminders
set module_key = 'breathing'
where name = 'Breathing exercise' and module_key is null;

-- Redefine the example seeder so fresh installs get the links too. The
-- UPDATEs above only reach databases seeded before this migration.
create or replace function public.seed_examples(p_user uuid)
returns text
language plpgsql
as $$
declare
  v_tz text;
  v_today date;
begin
  select timezone into v_tz from public.profiles where id = p_user;
  if v_tz is null then
    return 'no profile for that user id';
  end if;

  if exists (select 1 from public.reminders where user_id = p_user) then
    return 'account already has reminders, nothing seeded';
  end if;

  v_today := (now() at time zone v_tz)::date;

  insert into public.reminders
    (user_id, name, emoji, schedule_kind, times, days_of_week,
     retry_policy, retry_interval_minutes, max_retries, sort_order, module_key)
  values
    (p_user, 'Take medication', '💊', 'fixed_times', '{08:00}',
     '{0,1,2,3,4,5,6}', 'repeat', 15, 3, 0, null),
    (p_user, 'Kegel exercises', '🧘', 'fixed_times', '{09:30,14:30,20:30}',
     '{0,1,2,3,4,5,6}', 'once', 15, 3, 1, 'kegel'),
    (p_user, 'Breathing exercise', '🫁', 'fixed_times', '{13:00}',
     '{0,1,2,3,4,5,6}', 'once', 15, 3, 2, 'breathing');

  insert into public.reminders
    (user_id, name, emoji, schedule_kind, interval_minutes,
     window_start, window_end, days_of_week, retry_policy, sort_order)
  values
    (p_user, 'Active break', '🚶', 'interval', 50,
     '09:00', '18:00', '{1,2,3,4,5}', 'once', 3);

  -- progressive challenge: day 2 is 2 reps, day 15 is 15
  insert into public.challenges
    (user_id, name, exercises, unit, start_date, duration_days,
     progression_kind, start_amount, increment, sort_order)
  values
    (p_user, 'Squats and pushups', '{squats,pushups}', 'reps',
     v_today - 1, 60, 'linear', 1, 1, 0);

  insert into public.habits
    (user_id, name, emoji, polarity, sort_order)
  values
    (p_user, 'No sugar', '🍬', 'negative', 0);

  -- gym runs on a 3 days on, 1 day off cycle rather than fixed weekdays
  insert into public.habits
    (user_id, name, emoji, polarity, sort_order,
     schedule_kind, cycle_on_days, cycle_off_days, cycle_anchor_date)
  values
    (p_user, 'Gym', '🏋️', 'positive', 1, 'cycle', 3, 1, v_today);

  -- steps are recorded as a number, often a day or two late
  insert into public.habits
    (user_id, name, emoji, polarity, sort_order, kind, target_value, unit)
  values
    (p_user, '10,000 steps', '👟', 'positive', 2, 'numeric', 10000, 'steps');

  perform public.maintain_schedules(p_user);

  return 'seeded example reminders, challenge and habits';
end;
$$;

revoke execute on function public.seed_examples(uuid) from public, anon, authenticated;
grant execute on function public.seed_examples(uuid) to service_role;
