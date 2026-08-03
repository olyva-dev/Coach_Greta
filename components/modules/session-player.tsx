"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { Pause, Play, RotateCcw, X } from "lucide-react";
import type { Level, Module, Phase } from "@/lib/modules/types";
import { sessionReps } from "@/lib/modules/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface SessionResult {
  repsCompleted: number;
  setsCompleted: number;
  durationSeconds: number;
  completed: boolean;
}

interface Props {
  module: Module;
  level: Level;
  onFinish: (result: SessionResult) => void;
  onExit: () => void;
}

// Flattened timeline so the player only ever advances an index
interface Step {
  phase: Phase;
  setIndex: number;
  /** reps fully finished once this step ends */
  repsAfter: number;
}

function buildTimeline(level: Level): Step[] {
  const steps: Step[] = [];
  let reps = 0;
  for (let s = 0; s < level.sets; s++) {
    for (let r = 0; r < level.repsPerSet; r++) {
      level.repPhases.forEach((phase, pi) => {
        const isLastPhaseOfRep = pi === level.repPhases.length - 1;
        if (isLastPhaseOfRep) reps += 1;
        steps.push({ phase, setIndex: s, repsAfter: reps });
      });
    }
    if (s < level.sets - 1 && level.restBetweenSets > 0) {
      steps.push({
        phase: {
          kind: "rest",
          seconds: level.restBetweenSets,
          label: "Rest",
          cue: "Shake it out, next set coming",
        },
        setIndex: s,
        repsAfter: reps,
      });
    }
  }
  return steps;
}

const PHASE_STYLE: Record<
  Phase["kind"],
  { ring: string; text: string; glow: string }
> = {
  prepare: { ring: "stroke-muted-foreground", text: "text-muted-foreground", glow: "" },
  contract: { ring: "stroke-volt", text: "text-volt", glow: "" },
  hold: { ring: "stroke-gold", text: "text-gold", glow: "" },
  relax: { ring: "stroke-accent", text: "text-accent", glow: "" },
  rest: { ring: "stroke-muted-foreground", text: "text-muted-foreground", glow: "" },
};

const PREPARE_SECONDS = 5;
const PREPARE_PHASE: Phase = {
  kind: "prepare",
  seconds: PREPARE_SECONDS,
  label: "Get ready",
  cue: "Settle in and breathe normally",
};

interface ClockState {
  /** -1 is the prepare countdown */
  index: number;
  remaining: number;
  elapsed: number;
  finished: boolean;
}

const initialClock: ClockState = {
  index: -1,
  remaining: PREPARE_SECONDS,
  elapsed: 0,
  finished: false,
};

// One tick advances everything, so the interval never has to read state and
// the whole transition stays in a pure reducer.
function makeClockReducer(timeline: Step[]) {
  return function clockReducer(
    state: ClockState,
    action: "tick" | "restart"
  ): ClockState {
    if (action === "restart") return initialClock;
    if (state.finished) return state;

    const elapsed = state.elapsed + 1;
    if (state.remaining > 1) {
      return { ...state, remaining: state.remaining - 1, elapsed };
    }
    const next = state.index + 1;
    if (next >= timeline.length) {
      return { ...state, remaining: 0, elapsed, finished: true };
    }
    return {
      index: next,
      remaining: timeline[next].phase.seconds,
      elapsed,
      finished: false,
    };
  };
}

export function SessionPlayer({ module, level, onFinish, onExit }: Props) {
  const timeline = useMemo(() => buildTimeline(level), [level]);
  const totalReps = sessionReps(level);

  const reducer = useMemo(() => makeClockReducer(timeline), [timeline]);
  const [clock, dispatch] = useReducer(reducer, initialClock);
  const [paused, setPaused] = useState(false);

  const { index, remaining, elapsed, finished } = clock;

  // onFinish must fire exactly once per session, whether it ended by
  // running out or by the user leaving early
  const reportedRef = useRef(false);
  const report = useCallback(
    (result: SessionResult) => {
      if (reportedRef.current) return;
      reportedRef.current = true;
      onFinish(result);
    },
    [onFinish]
  );

  const step = index >= 0 ? timeline[index] : null;
  const phase = step?.phase ?? PREPARE_PHASE;
  const style = PHASE_STYLE[phase.kind];
  const repsDone = index >= 0 ? (timeline[index - 1]?.repsAfter ?? 0) : 0;
  const setsDone = step?.setIndex ?? 0;

  useEffect(() => {
    if (paused || finished) return;
    const id = setInterval(() => dispatch("tick"), 1000);
    return () => clearInterval(id);
  }, [paused, finished]);

  // report once the clock says the session ran out
  useEffect(() => {
    if (!finished) return;
    report({
      repsCompleted: totalReps,
      setsCompleted: level.sets,
      durationSeconds: elapsed,
      completed: true,
    });
  }, [finished, elapsed, level.sets, report, totalReps]);

  function endEarly() {
    report({
      repsCompleted: repsDone,
      setsCompleted: setsDone,
      durationSeconds: elapsed,
      completed: false,
    });
    onExit();
  }

  function restart() {
    dispatch("restart");
    setPaused(false);
  }

  const fraction = phase.seconds > 0 ? Math.max(0, remaining) / phase.seconds : 0;

  if (finished) {
    return (
      <div className="flex flex-col items-center gap-6 py-10 text-center animate-fade-in-up">
        <div className="text-6xl">✅</div>
        <div>
          <h2 className="text-2xl font-bold">Session complete</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {totalReps} reps · {formatTime(elapsed)} · {module.name}
          </p>
        </div>
        <Button size="lg" onClick={onExit}>
          Done
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <div className="flex w-full items-center justify-between">
        <p className="text-sm text-muted-foreground">{level.name}</p>
        <button
          onClick={endEarly}
          aria-label="End session"
          className="rounded-full p-2 text-muted-foreground hover:bg-surface-raised hover:text-foreground"
        >
          <X className="size-5" />
        </button>
      </div>

      <SegmentedRing fraction={fraction} ringClass={style.ring}>
        <span
          className={cn("metric text-6xl font-bold", style.text)}
          aria-live="off"
        >
          {Math.max(0, remaining)}
        </span>
        <span className="mt-2 text-center text-base font-semibold">
          {phase.label}
        </span>
        {phase.cue && (
          <span className="mt-1 max-w-[11rem] text-center text-xs leading-snug text-muted-foreground">
            {phase.cue}
          </span>
        )}
      </SegmentedRing>

      {/* the phase name is announced, the ticking number is not */}
      <p className="sr-only" aria-live="polite">
        {phase.label}
      </p>

      <div className="text-center">
        <p className="text-sm">
          <span className="metric text-lg font-bold">{repsDone}</span>
          <span className="text-muted-foreground">
            /{totalReps} rep{totalReps > 1 ? "s" : ""}
          </span>
          {level.sets > 1 && (
            <span className="ml-3 text-muted-foreground">
              set {setsDone + 1} of {level.sets}
            </span>
          )}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {formatTime(elapsed)} elapsed
        </p>
      </div>

      <div className="flex items-center gap-4">
        <Button
          variant="secondary"
          size="icon"
          aria-label="Restart"
          onClick={restart}
        >
          <RotateCcw />
        </Button>
        <Button
          className="h-16 w-16 rounded-full glow-volt"
          aria-label={paused ? "Resume" : "Pause"}
          onClick={() => setPaused((p) => !p)}
        >
          {paused ? (
            <Play className="size-6 fill-current" />
          ) : (
            <Pause className="size-6 fill-current" />
          )}
        </Button>
        <div className="size-10" aria-hidden="true" />
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Ring of tick marks that depletes as the phase runs down
function SegmentedRing({
  fraction,
  ringClass,
  children,
  segments = 60,
  size = 260,
}: {
  fraction: number;
  ringClass: string;
  children: React.ReactNode;
  segments?: number;
  size?: number;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const lit = Math.ceil(Math.max(0, Math.min(1, fraction)) * segments);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} aria-hidden="true">
        {Array.from({ length: segments }).map((_, i) => {
          // start at 12 o'clock, run clockwise
          const angle = (i / segments) * 2 * Math.PI - Math.PI / 2;
          const inner = size / 2 - 30;
          const outer = i < lit ? size / 2 - 6 : size / 2 - 14;
          return (
            <line
              key={i}
              x1={cx + Math.cos(angle) * inner}
              y1={cy + Math.sin(angle) * inner}
              x2={cx + Math.cos(angle) * outer}
              y2={cy + Math.sin(angle) * outer}
              strokeWidth={4}
              strokeLinecap="round"
              className={i < lit ? ringClass : "stroke-surface-raised"}
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center px-12">
        {children}
      </div>
    </div>
  );
}
