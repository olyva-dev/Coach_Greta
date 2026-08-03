-- Coach Greta: one-off reset, keeping only the guided exercise modules.
--
-- Run this by hand in the Supabase SQL editor. It is deliberately NOT a
-- migration: migrations describe schema and re-run on every fresh install,
-- and this deletes data.
--
-- KEEPS  your profile (name, timezone, quiet hours), your notification
--        devices, and any reminder that drives a guided module (Kegel,
--        Breathing).
-- DELETES every other reminder, all challenges, all habits, and the whole
--        activity history behind them.
--
-- There is no undo. Run the preview block first and read the numbers.

-- ---------------------------------------------------------------------
-- 1. PREVIEW: run this alone first and check it says what you expect
-- ---------------------------------------------------------------------
select 'reminders kept'        as what, count(*) from public.reminders where module_key is not null
union all select 'reminders deleted',      count(*) from public.reminders where module_key is null
union all select 'challenges deleted',     count(*) from public.challenges
union all select 'habits deleted',         count(*) from public.habits
union all select 'occurrences deleted',    count(*) from public.reminder_occurrences
union all select 'habit logs deleted',     count(*) from public.habit_logs
union all select 'challenge logs deleted', count(*) from public.challenge_logs
union all select 'sessions deleted',       count(*) from public.exercise_sessions
union all select 'devices kept',           count(*) from public.push_subscriptions;

-- ---------------------------------------------------------------------
-- 2. THE RESET: everything in one transaction, so it either all lands
--    or none of it does
-- ---------------------------------------------------------------------
begin;

-- history first
delete from public.exercise_sessions;
delete from public.notification_deliveries;
delete from public.reminder_occurrences;
delete from public.challenge_logs;
delete from public.habit_logs;

-- then the items themselves
delete from public.challenges;
delete from public.habits;
delete from public.reminders where module_key is null;

commit;

-- ---------------------------------------------------------------------
-- 3. Rebuild the schedule so the guided reminders start firing from today
-- ---------------------------------------------------------------------
select public.maintain_schedules();

-- ---------------------------------------------------------------------
-- 4. Confirm what survived
-- ---------------------------------------------------------------------
select name, module_key, times, status from public.reminders order by sort_order;
select count(*) as occurrences_scheduled from public.reminder_occurrences;
select display_name, timezone from public.profiles;
