import { describe, expect, it } from "vitest";
import {
  expandReminderTimes,
  localDateOf,
  localTimeLabel,
  localToday,
} from "./schedule";
import type { Reminder } from "@/lib/db/types";

function makeReminder(overrides: Partial<Reminder> = {}): Reminder {
  return {
    id: "r1",
    user_id: "u1",
    name: "Active break",
    emoji: null,
    notes: null,
    schedule_kind: "interval",
    times: null,
    interval_minutes: 50,
    window_start: "09:00:00",
    window_end: "18:00:00",
    days_of_week: [1, 2, 3, 4, 5],
    retry_policy: "once",
    retry_interval_minutes: 15,
    max_retries: 3,
    snooze_minutes: 10,
    status: "active",
    sort_order: 0,
    created_at: "",
    updated_at: "",
    ...overrides,
  };
}

describe("interval expansion", () => {
  it("expands every 50 minutes from 09:00 to 18:00 on a weekday", () => {
    // 2026-08-03 is a Monday
    const times = expandReminderTimes(makeReminder(), "2026-08-03");
    expect(times).toHaveLength(11);
    expect(times[0]).toBe("09:00:00");
    expect(times[1]).toBe("09:50:00");
    expect(times[10]).toBe("17:20:00");
  });

  it("produces nothing on an unscheduled day", () => {
    // 2026-08-02 is a Sunday
    expect(expandReminderTimes(makeReminder(), "2026-08-02")).toEqual([]);
  });

  it("includes the window end when the step lands on it", () => {
    const r = makeReminder({
      interval_minutes: 60,
      window_start: "09:00:00",
      window_end: "12:00:00",
      days_of_week: [0, 1, 2, 3, 4, 5, 6],
    });
    expect(expandReminderTimes(r, "2026-08-02")).toEqual([
      "09:00:00",
      "10:00:00",
      "11:00:00",
      "12:00:00",
    ]);
  });
});

describe("fixed times expansion", () => {
  it("returns the configured times sorted", () => {
    const r = makeReminder({
      schedule_kind: "fixed_times",
      times: ["20:30:00", "09:30:00", "14:30:00"],
      days_of_week: [0, 1, 2, 3, 4, 5, 6],
    });
    expect(expandReminderTimes(r, "2026-08-02")).toEqual([
      "09:30:00",
      "14:30:00",
      "20:30:00",
    ]);
  });
});

describe("timezone day boundaries", () => {
  it("Bogota has no DST: 03:00 UTC is always the previous local day", () => {
    expect(localDateOf("2026-08-02T03:00:00Z", "America/Bogota")).toBe(
      "2026-08-01"
    );
    expect(localDateOf("2026-01-02T03:00:00Z", "America/Bogota")).toBe(
      "2026-01-01"
    );
  });

  it("New York DST: the same UTC hour lands on different local days", () => {
    // EST (UTC-5) in winter: 04:30 UTC is 23:30 the previous day
    expect(localDateOf("2026-01-15T04:30:00Z", "America/New_York")).toBe(
      "2026-01-14"
    );
    // EDT (UTC-4) in summer: 04:30 UTC is 00:30 the same day
    expect(localDateOf("2026-07-15T04:30:00Z", "America/New_York")).toBe(
      "2026-07-15"
    );
  });

  it("labels occurrence instants in the user's wall clock", () => {
    // 13:00 UTC is 08:00 in Bogota (UTC-5, no DST)
    expect(localTimeLabel("2026-08-02T13:00:00Z", "America/Bogota")).toBe(
      "08:00"
    );
  });

  it("localToday follows the timezone, not the server clock", () => {
    const lateUtc = new Date("2026-08-03T02:00:00Z");
    expect(localToday("America/Bogota", lateUtc)).toBe("2026-08-02");
    expect(localToday("Asia/Tokyo", lateUtc)).toBe("2026-08-03");
  });
});
