import { differenceInCalendarDays, parseISO } from "date-fns";
import type { Challenge } from "@/lib/db/types";

// Day number is calendar based on purpose: pausing never shifts the ladder,
// the target is always derivable from the date alone.
export function dayNumber(challenge: Challenge, localDate: string): number {
  return (
    differenceInCalendarDays(parseISO(localDate), parseISO(challenge.start_date)) +
    1
  );
}

export function isWithinChallenge(
  challenge: Challenge,
  localDate: string
): boolean {
  const day = dayNumber(challenge, localDate);
  return day >= 1 && day <= challenge.duration_days;
}

export function isRestDay(challenge: Challenge, localDate: string): boolean {
  const dow = parseISO(localDate).getDay();
  return challenge.rest_days.includes(dow);
}

// The daily target for a 1-based day number. Rest days are the caller's
// concern: this is pure ladder math.
export function targetForDay(challenge: Challenge, day: number): number {
  if (day < 1) return 0;
  switch (challenge.progression_kind) {
    case "fixed":
      return challenge.start_amount ?? 0;
    case "linear": {
      const raw = (challenge.start_amount ?? 0) + (day - 1) * challenge.increment;
      return challenge.max_amount != null
        ? Math.min(raw, challenge.max_amount)
        : raw;
    }
    case "custom": {
      const amounts = challenge.custom_amounts ?? [];
      if (amounts.length === 0) return 0;
      // past the end of the ladder, hold the last amount
      return amounts[Math.min(day - 1, amounts.length - 1)];
    }
  }
}

export function targetForDate(
  challenge: Challenge,
  localDate: string
): number | null {
  if (!isWithinChallenge(challenge, localDate)) return null;
  if (isRestDay(challenge, localDate)) return null;
  return targetForDay(challenge, dayNumber(challenge, localDate));
}

// Total volume from day 1 through the given day, skipping nothing: rest days
// contribute only when they fall outside rest_days, which needs dates, so
// this simpler cumulative is used for the "total so far if perfect" line.
export function cumulativeTarget(challenge: Challenge, throughDay: number): number {
  let total = 0;
  for (let d = 1; d <= Math.min(throughDay, challenge.duration_days); d++) {
    total += targetForDay(challenge, d);
  }
  return total;
}
