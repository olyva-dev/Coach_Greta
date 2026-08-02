-- Coach Greta: example content, callable once per user.
-- In production run from the SQL editor after creating your user:
--   select public.seed_examples('<your-user-uuid>');
-- It refuses to run twice: an account with any reminders is left alone.

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

  -- recurring reminders
  insert into public.reminders
    (user_id, name, emoji, schedule_kind, times, days_of_week,
     retry_policy, retry_interval_minutes, max_retries, sort_order)
  values
    (p_user, 'Take medication', '💊', 'fixed_times', '{08:00}',
     '{0,1,2,3,4,5,6}', 'repeat', 15, 3, 0),
    (p_user, 'Kegel exercises', '🧘', 'fixed_times', '{09:30,14:30,20:30}',
     '{0,1,2,3,4,5,6}', 'once', 15, 3, 1),
    (p_user, 'Breathing exercise', '🫁', 'fixed_times', '{13:00}',
     '{0,1,2,3,4,5,6}', 'once', 15, 3, 2);

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

  -- daily habits
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

  perform public.maintain_schedules();

  return 'seeded example reminders, challenge and habits';
end;
$$;

revoke execute on function public.seed_examples(uuid) from public, anon, authenticated;
grant execute on function public.seed_examples(uuid) to service_role;
