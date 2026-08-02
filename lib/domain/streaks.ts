import { addDays, format, parseISO } from "date-fns";
import type { Habit } from "@/lib/db/types";
import { isScheduledOn } from "@/lib/domain/habits";

export type DayOutcome = "win" | "lose" | "neutral";

export interface LoggedDay {
  value: boolean;
  amount: number | null;
}

// Value semantics: a habit log's `value` records "this day counts as done".
// For a positive boolean habit that is the checkbox. For a negative habit
// ("did I eat sugar") value true is the slip. For a numeric habit the app
// sets value from amount >= target when logging.
//
// Outcome rules:
//   positive habit:  logged true -> win, logged false -> lose,
//                    unlogged past day -> lose, unlogged today -> neutral
//   negative habit:  logged true -> lose, logged false -> win,
//                    unlogged past day -> win (you never reported a slip),
//                    unlogged today -> provisional win
//   negative + require_explicit_check: unlogged past day -> lose,
//                    unlogged today -> neutral
//   any day the habit is not scheduled -> neutral
export function dayOutcome(
  habit: Habit,
  localDate: string,
  today: string,
  logged: LoggedDay | boolean | undefined
): DayOutcome {
  if (!isScheduledOn(habit, localDate)) return "neutral";

  const isToday = localDate === today;
  const value =
    typeof logged === "boolean" ? logged : logged ? logged.value : undefined;

  if (value !== undefined) {
    if (habit.polarity === "positive") return value ? "win" : "lose";
    return value ? "lose" : "win";
  }

  // unlogged
  if (habit.polarity === "positive") return isToday ? "neutral" : "lose";
  if (habit.require_explicit_check) return isToday ? "neutral" : "lose";
  return "win"; // negative habit, silence is a win
}

export interface StreakResult {
  current: number;
  best: number;
}

// logsByDate: local_date -> logged day. `from` bounds the scan (habit
// creation date works well); both bounds inclusive, dates as yyyy-MM-dd.
export function computeStreak(
  habit: Habit,
  logsByDate: ReadonlyMap<string, LoggedDay | boolean>,
  from: string,
  today: string
): StreakResult {
  let best = 0;
  let run = 0;
  const outcomes: DayOutcome[] = [];

  let cursor = parseISO(from);
  const end = parseISO(today);
  while (cursor <= end) {
    const date = format(cursor, "yyyy-MM-dd");
    const outcome = dayOutcome(habit, date, today, logsByDate.get(date));
    outcomes.push(outcome);
    if (outcome === "win") {
      run += 1;
      if (run > best) best = run;
    } else if (outcome === "lose") {
      run = 0;
    }
    cursor = addDays(cursor, 1);
  }

  // current streak: walk back from today, neutrals are transparent
  let current = 0;
  for (let i = outcomes.length - 1; i >= 0; i--) {
    if (outcomes[i] === "win") current += 1;
    else if (outcomes[i] === "lose") break;
  }

  return { current, best };
}
