import { addDays, format, parseISO } from "date-fns";
import type { Habit } from "@/lib/db/types";

export type DayOutcome = "win" | "lose" | "neutral";

// Value semantics: a habit log's `value` records what the checkbox said,
// true = "I did the thing named by the habit". For a negative habit
// ("did I eat sugar") true is therefore the slip.
//
// Outcome rules:
//   positive habit:  logged true -> win, logged false -> lose,
//                    unlogged past day -> lose, unlogged today -> neutral
//   negative habit:  logged true -> lose, logged false -> win,
//                    unlogged past day -> win (you never reported a slip),
//                    unlogged today -> provisional win
//   negative + require_explicit_check: unlogged past day -> lose
//                    (the habit demands a daily confirmation),
//                    unlogged today -> neutral
//   any day the habit is not scheduled (days_of_week) -> neutral
export function dayOutcome(
  habit: Habit,
  localDate: string,
  today: string,
  logged: boolean | undefined
): DayOutcome {
  const dow = parseISO(localDate).getDay();
  if (!habit.days_of_week.includes(dow)) return "neutral";

  const isToday = localDate === today;

  if (logged !== undefined) {
    if (habit.polarity === "positive") return logged ? "win" : "lose";
    return logged ? "lose" : "win";
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

// logsByDate: local_date -> value. `from` bounds the scan (habit creation
// date works well); both bounds inclusive, dates as yyyy-MM-dd.
export function computeStreak(
  habit: Habit,
  logsByDate: ReadonlyMap<string, boolean>,
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
