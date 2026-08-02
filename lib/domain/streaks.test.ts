import { describe, expect, it } from "vitest";
import { computeStreak, dayOutcome } from "./streaks";
import type { Habit } from "@/lib/db/types";

function makeHabit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: "h1",
    user_id: "u1",
    name: "Gym",
    emoji: null,
    polarity: "positive",
    days_of_week: [0, 1, 2, 3, 4, 5, 6],
    require_explicit_check: false,
    status: "active",
    sort_order: 0,
    created_at: "",
    updated_at: "",
    ...overrides,
  };
}

const TODAY = "2026-08-02";

describe("positive habit streaks", () => {
  const habit = makeHabit();

  it("counts consecutive checked days", () => {
    const logs = new Map([
      ["2026-07-30", true],
      ["2026-07-31", true],
      ["2026-08-01", true],
    ]);
    expect(computeStreak(habit, logs, "2026-07-28", TODAY)).toEqual({
      current: 3,
      best: 3,
    });
  });

  it("a missed past day breaks the streak", () => {
    const logs = new Map([
      ["2026-07-29", true],
      ["2026-07-30", true],
      // 07-31 unlogged -> lose
      ["2026-08-01", true],
    ]);
    const r = computeStreak(habit, logs, "2026-07-29", TODAY);
    expect(r.current).toBe(1);
    expect(r.best).toBe(2);
  });

  it("today unlogged is neutral, the streak survives", () => {
    const logs = new Map([
      ["2026-07-31", true],
      ["2026-08-01", true],
    ]);
    expect(computeStreak(habit, logs, "2026-07-31", TODAY).current).toBe(2);
  });

  it("unscheduled days are transparent", () => {
    const weekdays = makeHabit({ days_of_week: [1, 2, 3, 4, 5] });
    const logs = new Map([
      ["2026-07-30", true], // Thursday
      ["2026-07-31", true], // Friday
      // Aug 1 Saturday, Aug 2 Sunday: not scheduled
    ]);
    expect(computeStreak(weekdays, logs, "2026-07-30", TODAY).current).toBe(2);
  });
});

describe("negative habit streaks (no sugar)", () => {
  const habit = makeHabit({ polarity: "negative", name: "No sugar" });

  it("silence is a win: unlogged days count", () => {
    const logs = new Map<string, boolean>();
    // 5 days of never reporting a slip, today included provisionally
    expect(computeStreak(habit, logs, "2026-07-29", TODAY).current).toBe(5);
  });

  it("a logged slip breaks the streak", () => {
    const logs = new Map([["2026-08-01", true]]);
    const r = computeStreak(habit, logs, "2026-07-29", TODAY);
    expect(r.current).toBe(1); // today only
    expect(r.best).toBe(3);
  });

  it("an explicit clean mark is a win", () => {
    expect(dayOutcome(habit, "2026-08-01", TODAY, false)).toBe("win");
  });
});

describe("negative habit with require_explicit_check", () => {
  const habit = makeHabit({
    polarity: "negative",
    require_explicit_check: true,
  });

  it("an unanswered past day breaks the streak", () => {
    const logs = new Map([
      ["2026-07-31", false],
      // 08-01 unanswered -> lose
    ]);
    const r = computeStreak(habit, logs, "2026-07-31", TODAY);
    expect(r.current).toBe(0);
    expect(r.best).toBe(1);
  });

  it("today unanswered is neutral", () => {
    const logs = new Map([["2026-08-01", false]]);
    expect(computeStreak(habit, logs, "2026-08-01", TODAY).current).toBe(1);
  });
});
