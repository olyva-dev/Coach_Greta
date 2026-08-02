-- Coach Greta: numeric habits and cycle schedules
--
-- Two additions driven by real use:
--   * "10,000 steps" is not a yes/no: you record the actual count, often a
--     day or two later. Numeric habits store an amount and a target.
--   * "gym 3 days then 1 rest" does not fit days of the week. Cycle
--     schedules repeat an on/off pattern from an anchor date.
--
-- habit_logs.value keeps its meaning ("this day counts as done") so all
-- existing streak logic works unchanged; numeric habits set it from
-- amount >= target_value when logging.

alter table public.habits
  add column kind text not null default 'boolean'
    check (kind in ('boolean', 'numeric')),
  add column target_value numeric,
  add column unit text,
  add column schedule_kind text not null default 'days_of_week'
    check (schedule_kind in ('days_of_week', 'cycle')),
  add column cycle_on_days int check (cycle_on_days between 1 and 30),
  add column cycle_off_days int check (cycle_off_days between 0 and 30),
  add column cycle_anchor_date date;

alter table public.habits
  add constraint habits_numeric_shape check (
    kind = 'boolean' or (target_value is not null and target_value > 0)
  ),
  add constraint habits_cycle_shape check (
    schedule_kind = 'days_of_week'
    or (cycle_on_days is not null
        and cycle_off_days is not null
        and cycle_anchor_date is not null)
  );

alter table public.habit_logs
  add column amount numeric;

-- Update the seeded examples to match how they are actually tracked
update public.habits
set kind = 'numeric', target_value = 10000, unit = 'steps'
where name = '10,000 steps' and kind = 'boolean';

update public.habits
set schedule_kind = 'cycle',
    cycle_on_days = 3,
    cycle_off_days = 1,
    cycle_anchor_date = coalesce(cycle_anchor_date, current_date)
where name = 'Gym' and schedule_kind = 'days_of_week';
