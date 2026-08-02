import { describe, expect, it } from "vitest";
import { cyclePosition, describeSchedule, isScheduledOn, meetsTarget } from "./habits";
import { levelFromXp, isPerfectDay, streakBadges, totalXp } from "./gamification";
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
    kind: "boolean",
    target_value: null,
    unit: null,
    schedule_kind: "days_of_week",
    cycle_on_days: null,
    cycle_off_days: null,
    cycle_anchor_date: null,
    status: "active",
    sort_order: 0,
    created_at: "",
    updated_at: "",
    ...overrides,
  };
}

describe("gym on a 3 on, 1 off cycle", () => {
  const gym = makeHabit({
    schedule_kind: "cycle",
    cycle_on_days: 3,
    cycle_off_days: 1,
    cycle_anchor_date: "2026-08-03",
  });

  it("trains the first three days then rests", () => {
    expect(isScheduledOn(gym, "2026-08-03")).toBe(true);
    expect(isScheduledOn(gym, "2026-08-04")).toBe(true);
    expect(isScheduledOn(gym, "2026-08-05")).toBe(true);
    expect(isScheduledOn(gym, "2026-08-06")).toBe(false);
  });

  it("repeats the pattern", () => {
    expect(isScheduledOn(gym, "2026-08-07")).toBe(true);
    expect(isScheduledOn(gym, "2026-08-10")).toBe(false);
  });

  it("cycles correctly before the anchor date too", () => {
    expect(isScheduledOn(gym, "2026-08-02")).toBe(false);
    expect(isScheduledOn(gym, "2026-08-01")).toBe(true);
  });

  it("reports position in the cycle", () => {
    expect(cyclePosition(gym, "2026-08-04")).toEqual({
      index: 1,
      period: 4,
      isOnDay: true,
    });
    expect(cyclePosition(gym, "2026-08-06")?.isOnDay).toBe(false);
  });

  it("describes itself", () => {
    expect(describeSchedule(gym)).toBe("3 on, 1 off");
  });
});

describe("numeric habits", () => {
  const steps = makeHabit({
    name: "10,000 steps",
    kind: "numeric",
    target_value: 10000,
    unit: "steps",
  });

  it("meets the target at or above it", () => {
    expect(meetsTarget(steps, 10000)).toBe(true);
    expect(meetsTarget(steps, 12500)).toBe(true);
  });

  it("falls short below it", () => {
    expect(meetsTarget(steps, 9999)).toBe(false);
  });

  it("an unlogged amount is not a hit", () => {
    expect(meetsTarget(steps, null)).toBe(false);
  });
});

describe("levels", () => {
  it("starts at level 1", () => {
    expect(levelFromXp(0).level).toBe(1);
  });

  it("reaches level 2 at 300 xp", () => {
    expect(levelFromXp(299).level).toBe(1);
    expect(levelFromXp(300).level).toBe(2);
  });

  it("keeps progress inside the level", () => {
    const l = levelFromXp(400);
    expect(l.level).toBe(2);
    expect(l.xpIntoLevel).toBe(100);
    expect(l.xpForLevel).toBe(300);
    expect(l.progress).toBeCloseTo(1 / 3);
  });

  it("sums xp from each source", () => {
    expect(
      totalXp({
        habitWins: 3,
        challengeDays: 2,
        remindersDone: 4,
        perfectDays: 1,
      })
    ).toBe(30 + 30 + 20 + 25);
  });
});

describe("badges and perfect days", () => {
  it("earns milestones up to the best streak", () => {
    const badges = streakBadges(10);
    expect(badges.filter((b) => b.earned).map((b) => b.label)).toEqual([
      "3 day streak",
      "7 day streak",
    ]);
  });

  it("a perfect day needs everything closed", () => {
    expect(
      isPerfectDay({
        habitsScheduled: 2,
        habitWins: 2,
        challengesDue: 1,
        challengesDone: 1,
        remindersDue: 3,
        remindersDone: 3,
      })
    ).toBe(true);
  });

  it("is not perfect with anything left open", () => {
    expect(
      isPerfectDay({
        habitsScheduled: 2,
        habitWins: 1,
        challengesDue: 1,
        challengesDone: 1,
        remindersDue: 0,
        remindersDone: 0,
      })
    ).toBe(false);
  });

  it("an empty day is not perfect", () => {
    expect(
      isPerfectDay({
        habitsScheduled: 0,
        habitWins: 0,
        challengesDue: 0,
        challengesDone: 0,
        remindersDue: 0,
        remindersDone: 0,
      })
    ).toBe(false);
  });
});
