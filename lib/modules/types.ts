// Guided exercise modules: a protocol is a sequence of timed phases,
// repeated for reps, repeated for sets. Definitions live in code because
// they are medical content that should be reviewed and versioned with the
// app rather than edited at runtime.

export type PhaseKind = "prepare" | "contract" | "hold" | "relax" | "rest";

export interface Phase {
  kind: PhaseKind;
  seconds: number;
  /** Shown large under the countdown */
  label: string;
  /** One short line of coaching under the label */
  cue?: string;
}

export interface Level {
  key: string;
  name: string;
  /** Who this level is for */
  description: string;
  /** Phases that make up ONE repetition */
  repPhases: Phase[];
  repsPerSet: number;
  sets: number;
  /** Rest between sets, 0 for none */
  restBetweenSets: number;
  /** How often to run this level in a day, for guidance copy */
  timesPerDay: string;
}

export interface Module {
  key: string;
  name: string;
  emoji: string;
  /** One sentence on what this trains and why */
  summary: string;
  /** Step by step, how to do it correctly */
  howTo: { title: string; body: string }[];
  /** Things that make it useless or harmful */
  cautions: string[];
  /** Where the protocol comes from, shown in the UI */
  sources: { label: string; url: string }[];
  levels: Level[];
  defaultLevelKey: string;
}

/** Total seconds for one full session at a level */
export function sessionSeconds(level: Level): number {
  const repSeconds = level.repPhases.reduce((s, p) => s + p.seconds, 0);
  const work = repSeconds * level.repsPerSet * level.sets;
  const rest = level.restBetweenSets * Math.max(0, level.sets - 1);
  return work + rest;
}

/** Total reps in a full session */
export function sessionReps(level: Level): number {
  return level.repsPerSet * level.sets;
}

export function findLevel(module: Module, key: string): Level {
  return module.levels.find((l) => l.key === key) ?? module.levels[0];
}
