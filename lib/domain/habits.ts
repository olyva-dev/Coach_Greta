import { differenceInCalendarDays, parseISO } from "date-fns";
import type { Habit } from "@/lib/db/types";

// Is the habit expected on this local date?
// days_of_week: a fixed weekly pattern.
// cycle: an on/off pattern repeating from an anchor date, for things like
// "gym 3 days then 1 rest" that drift across the week.
export function isScheduledOn(habit: Habit, localDate: string): boolean {
  if (habit.schedule_kind === "cycle") {
    const on = habit.cycle_on_days ?? 0;
    const off = habit.cycle_off_days ?? 0;
    const period = on + off;
    if (period <= 0 || on <= 0) return false;
    if (!habit.cycle_anchor_date) return false;
    const delta = differenceInCalendarDays(
      parseISO(localDate),
      parseISO(habit.cycle_anchor_date)
    );
    // JS % keeps the sign, normalise so dates before the anchor still cycle
    const index = ((delta % period) + period) % period;
    return index < on;
  }
  return habit.days_of_week.includes(parseISO(localDate).getDay());
}

// Where the date sits in its cycle, for UI like "day 2 of 3 on"
export function cyclePosition(
  habit: Habit,
  localDate: string
): { index: number; period: number; isOnDay: boolean } | null {
  if (habit.schedule_kind !== "cycle") return null;
  const on = habit.cycle_on_days ?? 0;
  const off = habit.cycle_off_days ?? 0;
  const period = on + off;
  if (period <= 0 || !habit.cycle_anchor_date) return null;
  const delta = differenceInCalendarDays(
    parseISO(localDate),
    parseISO(habit.cycle_anchor_date)
  );
  const index = ((delta % period) + period) % period;
  return { index, period, isOnDay: index < on };
}

// For numeric habits, does this amount meet the target?
export function meetsTarget(habit: Habit, amount: number | null): boolean {
  if (habit.kind !== "numeric") return false;
  if (amount === null) return false;
  return amount >= (habit.target_value ?? 0);
}

export function describeSchedule(habit: Habit): string {
  if (habit.schedule_kind === "cycle") {
    const on = habit.cycle_on_days ?? 0;
    const off = habit.cycle_off_days ?? 0;
    return off === 0
      ? `every day (${on} day cycle)`
      : `${on} on, ${off} off`;
  }
  if (habit.days_of_week.length === 7) return "daily";
  if (
    habit.days_of_week.length === 5 &&
    !habit.days_of_week.includes(0) &&
    !habit.days_of_week.includes(6)
  ) {
    return "weekdays";
  }
  return `${habit.days_of_week.length} days a week`;
}
