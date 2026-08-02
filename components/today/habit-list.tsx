"use client";

import { useOptimistic, useTransition } from "react";
import { Check, CircleSlash } from "lucide-react";
import { setHabitLog } from "@/app/actions/habits";
import type { TodayHabit } from "@/lib/domain/view";
import { cn } from "@/lib/utils";

interface Props {
  habits: TodayHabit[];
  today: string;
}

// Each habit chip cycles through its states on tap:
//   positive:                unlogged -> done -> unlogged
//   negative:                clean (unlogged) -> slipped -> unlogged
//   negative explicit check: unlogged -> confirmed clean -> slipped -> unlogged
export function HabitList({ habits, today }: Props) {
  const [, startTransition] = useTransition();
  const [optimistic, applyOptimistic] = useOptimistic(
    new Map<string, boolean | null>(),
    (state, update: { id: string; value: boolean | null }) => {
      const next = new Map(state);
      next.set(update.id, update.value);
      return next;
    }
  );

  if (habits.length === 0) return null;

  function nextValue(item: TodayHabit, current: boolean | null): boolean | null {
    const { habit } = item;
    if (habit.polarity === "positive") {
      return current === true ? null : true;
    }
    if (habit.require_explicit_check) {
      if (current === null) return false; // confirm clean
      if (current === false) return true; // slipped
      return null;
    }
    return current === true ? null : true; // negative: toggle the slip
  }

  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
        Checklist
      </h2>
      <div className="flex flex-wrap gap-2">
        {habits.map((item) => {
          const { habit, log } = item;
          const value = optimistic.has(habit.id)
            ? (optimistic.get(habit.id) ?? null)
            : (log?.value ?? null);

          const negative = habit.polarity === "negative";
          // visual state of the chip
          const isWin = negative
            ? value === false || (value === null && !habit.require_explicit_check)
            : value === true;
          const isLoss = negative ? value === true : false;

          return (
            <button
              key={habit.id}
              onClick={() =>
                startTransition(async () => {
                  const next = nextValue(item, value);
                  applyOptimistic({ id: habit.id, value: next });
                  await setHabitLog(habit.id, today, next);
                })
              }
              className={cn(
                "flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition-colors active:scale-[0.97]",
                isLoss
                  ? "border-destructive/50 bg-destructive/15 text-destructive"
                  : isWin
                    ? "border-primary/50 bg-primary/15 text-primary"
                    : "border-border bg-surface text-muted-foreground"
              )}
            >
              <span className="text-base leading-none">{habit.emoji}</span>
              {habit.name}
              {isLoss ? (
                <CircleSlash className="size-4" />
              ) : isWin ? (
                <Check className="size-4" />
              ) : null}
            </button>
          );
        })}
      </div>
      {habits.some(
        (h) => h.habit.polarity === "negative" && !h.habit.require_explicit_check
      ) && (
        <p className="mt-2 text-xs text-muted-foreground">
          Avoid habits start the day clean, tap only if you slipped
        </p>
      )}
    </section>
  );
}
