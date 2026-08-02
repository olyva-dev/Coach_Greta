import { describe, expect, it } from "vitest";
import {
  cumulativeTarget,
  dayNumber,
  targetForDate,
  targetForDay,
} from "./challenge";
import type { Challenge } from "@/lib/db/types";

function makeChallenge(overrides: Partial<Challenge> = {}): Challenge {
  return {
    id: "c1",
    user_id: "u1",
    name: "Squats and pushups",
    exercises: ["squats", "pushups"],
    unit: "reps",
    start_date: "2026-08-01",
    duration_days: 60,
    progression_kind: "linear",
    start_amount: 1,
    increment: 1,
    max_amount: null,
    custom_amounts: null,
    rest_days: [],
    status: "active",
    sort_order: 0,
    created_at: "",
    updated_at: "",
    ...overrides,
  };
}

describe("the squats and pushups example", () => {
  const c = makeChallenge();

  it("august 2 is day 2 and the target is 2", () => {
    expect(dayNumber(c, "2026-08-02")).toBe(2);
    expect(targetForDate(c, "2026-08-02")).toBe(2);
  });

  it("day 15 the target is 15", () => {
    expect(dayNumber(c, "2026-08-15")).toBe(15);
    expect(targetForDate(c, "2026-08-15")).toBe(15);
  });

  it("before the start there is no target", () => {
    expect(targetForDate(c, "2026-07-31")).toBeNull();
  });

  it("after the last day there is no target", () => {
    // day 60 of an August 1 start is September 29
    expect(targetForDate(c, "2026-09-29")).toBe(60);
    expect(targetForDate(c, "2026-09-30")).toBeNull();
  });
});

describe("linear progression with a cap", () => {
  const c = makeChallenge({ start_amount: 10, increment: 5, max_amount: 30 });

  it("caps at max_amount", () => {
    expect(targetForDay(c, 1)).toBe(10);
    expect(targetForDay(c, 5)).toBe(30);
    expect(targetForDay(c, 40)).toBe(30);
  });
});

describe("fixed progression", () => {
  const c = makeChallenge({ progression_kind: "fixed", start_amount: 20 });

  it("is the same every day", () => {
    expect(targetForDay(c, 1)).toBe(20);
    expect(targetForDay(c, 42)).toBe(20);
  });
});

describe("custom ladder", () => {
  const c = makeChallenge({
    progression_kind: "custom",
    custom_amounts: [5, 10, 15, 20],
    start_amount: null,
  });

  it("follows the ladder day by day", () => {
    expect(targetForDay(c, 1)).toBe(5);
    expect(targetForDay(c, 4)).toBe(20);
  });

  it("holds the last amount past the ladder end", () => {
    expect(targetForDay(c, 10)).toBe(20);
  });
});

describe("rest days", () => {
  // 2026-08-02 is a Sunday (dow 0)
  const c = makeChallenge({ rest_days: [0] });

  it("has no target on a rest day", () => {
    expect(targetForDate(c, "2026-08-02")).toBeNull();
  });

  it("resumes the calendar ladder after the rest day", () => {
    expect(targetForDate(c, "2026-08-03")).toBe(3);
  });
});

describe("cumulative target", () => {
  const c = makeChallenge();

  it("sums the ladder", () => {
    // 1+2+3+4+5
    expect(cumulativeTarget(c, 5)).toBe(15);
  });

  it("stops at duration_days", () => {
    const short = makeChallenge({ duration_days: 3 });
    expect(cumulativeTarget(short, 100)).toBe(6);
  });
});
