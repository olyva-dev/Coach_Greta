import { describe, expect, it } from "vitest";
import { MODULES, getModule } from "./registry";
import { findLevel, sessionReps, sessionSeconds } from "./types";
import { kegelModule } from "./kegel";

describe("module registry", () => {
  it("resolves modules by key", () => {
    expect(getModule("kegel")?.name).toBe("Kegel exercises");
    expect(getModule("breathing")?.name).toBe("Breathing exercise");
    expect(getModule("nope")).toBeUndefined();
  });

  it("every module has a valid default level", () => {
    for (const m of MODULES) {
      expect(m.levels.some((l) => l.key === m.defaultLevelKey)).toBe(true);
    }
  });

  it("every level has at least one phase and positive durations", () => {
    for (const m of MODULES) {
      for (const l of m.levels) {
        expect(l.repPhases.length).toBeGreaterThan(0);
        expect(l.repsPerSet).toBeGreaterThan(0);
        expect(l.sets).toBeGreaterThan(0);
        for (const p of l.repPhases) {
          expect(p.seconds).toBeGreaterThan(0);
        }
      }
    }
  });

  it("falls back to the first level for an unknown key", () => {
    expect(findLevel(kegelModule, "does-not-exist")).toBe(kegelModule.levels[0]);
  });
});

describe("kegel protocol matches the published guidance", () => {
  it("starter is Mayo's 3 seconds on, 3 off, 10 reps", () => {
    const l = findLevel(kegelModule, "starter");
    expect(l.repPhases.map((p) => [p.kind, p.seconds])).toEqual([
      ["contract", 3],
      ["relax", 3],
    ]);
    expect(l.repsPerSet).toBe(10);
    expect(sessionReps(l)).toBe(10);
    expect(sessionSeconds(l)).toBe(60);
  });

  it("endurance is Sloan Kettering's 10 on, 10 off", () => {
    const l = findLevel(kegelModule, "endurance");
    expect(l.repPhases.map((p) => p.seconds)).toEqual([10, 10]);
    expect(sessionSeconds(l)).toBe(200);
  });

  it("quick set uses 2 second contractions", () => {
    const l = findLevel(kegelModule, "quick-and-long");
    expect(l.repPhases.map((p) => p.seconds)).toEqual([2, 2]);
  });

  it("cites its sources", () => {
    expect(kegelModule.sources.length).toBeGreaterThanOrEqual(2);
    for (const s of kegelModule.sources) {
      expect(s.url).toMatch(/^https:\/\//);
    }
  });

  it("warns about the things that make it useless or harmful", () => {
    const text = kegelModule.cautions.join(" ").toLowerCase();
    expect(text).toContain("breath");
    expect(text).toContain("urine");
    expect(text).toMatch(/stomach|abdomen|buttock/);
  });
});

describe("session totals", () => {
  it("counts reps across sets", () => {
    const level = {
      ...findLevel(kegelModule, "starter"),
      sets: 4,
      restBetweenSets: 30,
    };
    expect(sessionReps(level)).toBe(40);
    // 6s per rep x 10 reps x 4 sets + 3 rests of 30s
    expect(sessionSeconds(level)).toBe(240 + 90);
  });
});
