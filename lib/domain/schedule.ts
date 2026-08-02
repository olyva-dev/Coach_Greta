import { TZDate } from "@date-fns/tz";
import { format, parseISO } from "date-fns";
import type { Reminder } from "@/lib/db/types";

// Wall clock times ("HH:mm:ss") a reminder is scheduled for on a local date.
// Mirrors the SQL expansion in maintain_schedules exactly.
export function expandReminderTimes(
  reminder: Reminder,
  localDate: string
): string[] {
  const dow = parseISO(localDate).getDay();
  if (!reminder.days_of_week.includes(dow)) return [];

  if (reminder.schedule_kind === "fixed_times") {
    return [...(reminder.times ?? [])].sort();
  }

  const out: string[] = [];
  const start = toMinutes(reminder.window_start!);
  const end = toMinutes(reminder.window_end!);
  const step = reminder.interval_minutes!;
  for (let m = start; m <= end; m += step) {
    out.push(fromMinutes(m));
  }
  return out;
}

function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function fromMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
}

// The user's current local date as yyyy-MM-dd
export function localToday(timezone: string, now: Date = new Date()): string {
  return format(new TZDate(now, timezone), "yyyy-MM-dd");
}

// Local date a UTC instant falls on in a timezone: used to group occurrence
// timestamps by day, matching the SQL (ts at time zone tz)::date
export function localDateOf(
  utcIso: string,
  timezone: string
): string {
  return format(new TZDate(utcIso, timezone), "yyyy-MM-dd");
}

// Wall clock label for an occurrence timestamp in the user's timezone
export function localTimeLabel(utcIso: string, timezone: string): string {
  return format(new TZDate(utcIso, timezone), "HH:mm");
}
