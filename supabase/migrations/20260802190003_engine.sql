-- Coach Greta: reminder engine
-- Plain plpgsql/sql. Nothing here depends on Supabase: on self hosted
-- Postgres these functions run unchanged, only the cron registration in the
-- platform migration needs replacing.

-- Quiet hours test, handles windows that wrap midnight (22:00 to 07:00)
create or replace function public.is_quiet_time(
  p_start time,
  p_end time,
  p_local time
)
returns boolean
language sql
immutable
as $$
  select case
    when p_start is null or p_end is null then false
    when p_start = p_end then false
    when p_start < p_end then p_local >= p_start and p_local < p_end
    else p_local >= p_start or p_local < p_end
  end
$$;

-- ---------------------------------------------------------------------------
-- maintain_schedules: runs every 15 minutes under cron (p_user null = all
-- users). The app calls it for one user via refresh_my_schedules below, so
-- schedule edits show up instantly instead of at the next cron tick.
-- 1. materialises occurrences for today and tomorrow in each user's timezone
-- 2. drops pending occurrences of paused or archived reminders
-- 3. marks unresolved occurrences from previous local days as missed
-- ---------------------------------------------------------------------------
create or replace function public.maintain_schedules(p_user uuid default null)
returns void
language plpgsql
as $$
declare
  r record;
  v_day date;
  v_t time;
  v_scheduled timestamptz;
  d int;
begin
  for r in
    select rem.*, p.timezone as tz
    from public.reminders rem
    join public.profiles p on p.id = rem.user_id
    where rem.status = 'active'
      and (p_user is null or rem.user_id = p_user)
  loop
    for d in 0..1 loop
      v_day := (now() at time zone r.tz)::date + d;

      if not (extract(dow from v_day)::smallint = any (r.days_of_week)) then
        continue;
      end if;

      if r.schedule_kind = 'fixed_times' then
        foreach v_t in array r.times loop
          v_scheduled := (v_day + v_t) at time zone r.tz;
          insert into public.reminder_occurrences
            (user_id, reminder_id, local_date, scheduled_for, notify_after)
          values (
            r.user_id, r.id, v_day, v_scheduled,
            -- an occurrence created long after its slot must not fire a
            -- stale push, but it still shows in the app for manual marking
            case when v_scheduled >= now() - interval '30 minutes'
                 then v_scheduled end
          )
          on conflict (reminder_id, scheduled_for) do nothing;
        end loop;
      else
        v_t := r.window_start;
        while v_t <= r.window_end loop
          v_scheduled := (v_day + v_t) at time zone r.tz;
          insert into public.reminder_occurrences
            (user_id, reminder_id, local_date, scheduled_for, notify_after)
          values (
            r.user_id, r.id, v_day, v_scheduled,
            case when v_scheduled >= now() - interval '30 minutes'
                 then v_scheduled end
          )
          on conflict (reminder_id, scheduled_for) do nothing;

          v_t := v_t + make_interval(mins => r.interval_minutes);
          -- time arithmetic wraps at midnight, bail out if it did
          exit when v_t <= r.window_start;
        end loop;
      end if;
    end loop;
  end loop;

  -- pausing or archiving a reminder withdraws its not yet touched occurrences
  delete from public.reminder_occurrences o
  using public.reminders rem
  where rem.id = o.reminder_id
    and rem.status <> 'active'
    and o.status = 'pending'
    and (p_user is null or o.user_id = p_user);

  -- close the books on previous local days
  update public.reminder_occurrences o
  set status = 'missed', notify_after = null
  from public.profiles p
  where p.id = o.user_id
    and o.status in ('pending', 'notified', 'snoozed')
    and o.local_date < (now() at time zone p.timezone)::date
    and (p_user is null or o.user_id = p_user);
end;
$$;

-- App facing wrapper: regenerates only the caller's schedules. SECURITY
-- DEFINER because maintain_schedules needs owner access across RLS; scoping
-- to auth.uid() keeps it single user safe.
create or replace function public.refresh_my_schedules()
returns void
language sql
security definer
set search_path = public
as $$
  select public.maintain_schedules(auth.uid())
  where auth.uid() is not null
$$;

-- ---------------------------------------------------------------------------
-- claim_due_notifications: called by the delivery Edge Function every minute.
-- A single writable CTE claims and advances state atomically, so overlapping
-- ticks can never send the same notification twice.
-- ---------------------------------------------------------------------------
create or replace function public.claim_due_notifications(
  p_now timestamptz default now()
)
returns table (
  occurrence_id uuid,
  user_id uuid,
  reminder_id uuid,
  reminder_name text,
  reminder_emoji text,
  scheduled_for timestamptz,
  local_date date,
  notify_count int,
  snooze_minutes int
)
language sql
as $$
  with candidate as (
    select o.id
    from public.reminder_occurrences o
    join public.reminders r on r.id = o.reminder_id
    join public.profiles p on p.id = o.user_id
    where o.notify_after is not null
      and o.notify_after <= p_now
      and o.status in ('pending', 'notified', 'snoozed')
      and r.status = 'active'
      -- only fire on the occurrence's own local day
      and o.local_date = (p_now at time zone p.timezone)::date
      and not public.is_quiet_time(
        p.quiet_hours_start, p.quiet_hours_end,
        (p_now at time zone p.timezone)::time
      )
      -- when a newer occurrence of the same reminder is already due,
      -- stop nagging about the older one
      and not exists (
        select 1
        from public.reminder_occurrences o2
        where o2.reminder_id = o.reminder_id
          and o2.scheduled_for > o.scheduled_for
          and o2.notify_after is not null
          and o2.notify_after <= p_now
      )
    order by o.notify_after
    limit 50
    for update of o skip locked
  ),
  claimed as (
    update public.reminder_occurrences o
    set notify_count = o.notify_count + 1,
        last_notified_at = p_now,
        status = 'notified',
        notify_after = case
          when r.retry_policy = 'repeat' and o.notify_count < r.max_retries
            then p_now + make_interval(mins => r.retry_interval_minutes)
          when r.retry_policy = 'one_retry' and o.notify_count = 0
            then p_now + make_interval(mins => r.retry_interval_minutes)
          else null
        end
    from public.reminders r
    where r.id = o.reminder_id
      and o.id in (select id from candidate)
    returning
      o.id, o.user_id, o.reminder_id, r.name, r.emoji,
      o.scheduled_for, o.local_date, o.notify_count, r.snooze_minutes
  )
  select * from claimed
$$;

-- ---------------------------------------------------------------------------
-- apply_notification_action: shared by the app (as the user, under RLS) and
-- the notification-action Edge Function (as service role). SECURITY INVOKER
-- on purpose: RLS decides visibility for each caller.
-- ---------------------------------------------------------------------------
create or replace function public.apply_notification_action(
  p_occurrence_id uuid,
  p_action text
)
returns void
language plpgsql
as $$
declare
  v_snooze int;
begin
  select r.snooze_minutes
    into v_snooze
  from public.reminder_occurrences o
  join public.reminders r on r.id = o.reminder_id
  where o.id = p_occurrence_id;

  if v_snooze is null then
    return; -- unknown id, or not visible to this caller under RLS
  end if;

  if p_action = 'done' then
    update public.reminder_occurrences
    set status = 'done', completed_at = now(), notify_after = null
    where id = p_occurrence_id;
  elsif p_action = 'snooze' then
    update public.reminder_occurrences
    set status = 'snoozed',
        notify_after = now() + make_interval(mins => v_snooze)
    where id = p_occurrence_id;
  elsif p_action = 'skip' then
    update public.reminder_occurrences
    set status = 'skipped', completed_at = null, notify_after = null
    where id = p_occurrence_id;
  elsif p_action = 'undo' then
    update public.reminder_occurrences
    set status = 'pending', completed_at = null, notify_after = null
    where id = p_occurrence_id;
  else
    raise exception 'unknown action: %', p_action;
  end if;
end;
$$;

-- The engine entry points are for cron and the service role only; the app
-- gets the scoped wrapper
revoke execute on function public.maintain_schedules(uuid) from public, anon, authenticated;
revoke execute on function public.claim_due_notifications(timestamptz) from public, anon, authenticated;
revoke execute on function public.refresh_my_schedules() from public, anon;
grant execute on function public.maintain_schedules(uuid) to service_role;
grant execute on function public.claim_due_notifications(timestamptz) to service_role;
grant execute on function public.refresh_my_schedules() to authenticated;
