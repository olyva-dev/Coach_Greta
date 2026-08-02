"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Check, CircleSlash, History, Plus } from "lucide-react";
import { setHabitLog } from "@/app/actions/habits";
import type { TodayHabit } from "@/lib/domain/view";
import { GradientBar } from "@/components/ui/stat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface Props {
  habits: TodayHabit[];
  today: string;
}

interface OptimisticEntry {
  value: boolean | null;
  amount: number | null;
}

export function HabitList({ habits, today }: Props) {
  const [, startTransition] = useTransition();
  const [numericTarget, setNumericTarget] = useState<TodayHabit | null>(null);
  const [optimistic, applyOptimistic] = useOptimistic(
    new Map<string, OptimisticEntry>(),
    (state, update: { id: string; entry: OptimisticEntry }) => {
      const next = new Map(state);
      next.set(update.id, update.entry);
      return next;
    }
  );

  if (habits.length === 0) return null;

  const booleanHabits = habits.filter((h) => h.habit.kind === "boolean");
  const numericHabits = habits.filter((h) => h.habit.kind === "numeric");

  // Boolean chips cycle on tap:
  //   positive:                unlogged -> done -> unlogged
  //   negative:                clean -> slipped -> unlogged
  //   negative explicit check: unlogged -> confirmed clean -> slipped -> unlogged
  function nextValue(item: TodayHabit, current: boolean | null): boolean | null {
    const { habit } = item;
    if (habit.polarity === "positive") return current === true ? null : true;
    if (habit.require_explicit_check) {
      if (current === null) return false;
      if (current === false) return true;
      return null;
    }
    return current === true ? null : true;
  }

  function toggleBoolean(item: TodayHabit, current: boolean | null) {
    const next = nextValue(item, current);
    startTransition(async () => {
      applyOptimistic({
        id: item.habit.id,
        entry: { value: next, amount: null },
      });
      await setHabitLog(item.habit.id, today, { value: next });
    });
  }

  function saveAmount(item: TodayHabit, amount: number | null) {
    const meets =
      amount !== null && amount >= (item.habit.target_value ?? 0);
    startTransition(async () => {
      applyOptimistic({
        id: item.habit.id,
        entry: { value: amount === null ? null : meets, amount },
      });
      await setHabitLog(item.habit.id, today, { amount });
    });
    setNumericTarget(null);
  }

  function currentEntry(item: TodayHabit): OptimisticEntry {
    const o = optimistic.get(item.habit.id);
    if (o) return o;
    return {
      value: item.log?.value ?? null,
      amount: item.log?.amount ?? null,
    };
  }

  return (
    <section>
      <div className="mb-2.5 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <span className="h-4 w-1 rounded-full bg-lime" /> Checklist
        </h2>
        <a
          href="/progress#backfill"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <History className="size-3.5" /> Catch up
        </a>
      </div>

      {numericHabits.length > 0 && (
        <div className="mb-2 flex flex-col gap-2">
          {numericHabits.map((item) => {
            const { habit } = item;
            const entry = currentEntry(item);
            const target = habit.target_value ?? 0;
            const amount = entry.amount;
            const fraction = amount === null ? 0 : amount / target;
            return (
              <button
                key={habit.id}
                onClick={() => setNumericTarget(item)}
                className={cn(
                  "flex flex-col gap-2 rounded-lg border p-3 text-left transition-colors",
                  entry.value === true
                    ? "border-lime/40 bg-lime/8"
                    : "border-border bg-surface hover:border-lime/25"
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-surface-raised text-lg">
                    {habit.emoji ?? "🎯"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{habit.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {amount === null ? (
                        <span className="text-lime">Tap to add today</span>
                      ) : (
                        `${amount.toLocaleString()} of ${target.toLocaleString()} ${habit.unit ?? ""}`
                      )}
                    </p>
                  </div>
                  {amount === null ? (
                    <Plus className="size-4 text-muted-foreground" />
                  ) : (
                    <span
                      className={cn(
                        "metric text-xl font-bold",
                        entry.value ? "text-lime" : "text-foreground"
                      )}
                    >
                      {Math.round(fraction * 100)}%
                    </span>
                  )}
                </div>
                <GradientBar fraction={fraction} className="h-2" />
              </button>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {booleanHabits.map((item) => {
          const { habit } = item;
          const value = currentEntry(item).value;
          const negative = habit.polarity === "negative";
          const isWin = negative
            ? value === false || (value === null && !habit.require_explicit_check)
            : value === true;
          const isLoss = negative ? value === true : false;

          return (
            <button
              key={habit.id}
              onClick={() => toggleBoolean(item, value)}
              className={cn(
                "flex items-center gap-2 rounded-full border px-4 py-3 text-sm font-medium transition-all active:scale-[0.96]",
                isLoss
                  ? "border-destructive/50 bg-destructive/15 text-destructive"
                  : isWin
                    ? "border-lime/50 bg-lime/12 text-lime"
                    : "border-border bg-surface text-muted-foreground hover:border-lime/30"
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
        (h) =>
          h.habit.polarity === "negative" && !h.habit.require_explicit_check
      ) && (
        <p className="mt-2 text-xs text-muted-foreground">
          Avoid habits start the day clean, tap only if you slipped
        </p>
      )}

      <Sheet
        open={numericTarget !== null}
        onOpenChange={(o) => !o && setNumericTarget(null)}
      >
        {numericTarget && (
          <AmountSheet
            item={numericTarget}
            initial={currentEntry(numericTarget).amount}
            onSave={(amount) => saveAmount(numericTarget, amount)}
          />
        )}
      </Sheet>
    </section>
  );
}

function AmountSheet({
  item,
  initial,
  onSave,
}: {
  item: TodayHabit;
  initial: number | null;
  onSave: (amount: number | null) => void;
}) {
  const [text, setText] = useState(initial === null ? "" : String(initial));
  const { habit } = item;
  const target = habit.target_value ?? 0;
  const parsed = text.trim() === "" ? null : Number(text);
  const valid = parsed === null || (Number.isFinite(parsed) && parsed >= 0);

  return (
    <SheetContent title={habit.name}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) onSave(parsed);
        }}
        className="flex flex-col gap-4"
      >
        <p className="text-sm text-muted-foreground">
          Target is {target.toLocaleString()} {habit.unit ?? ""}. Enter what you
          actually did, you can come back and fill this in later.
        </p>
        <Input
          type="number"
          inputMode="numeric"
          min={0}
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={String(target)}
          className="metric h-16 text-center text-3xl"
        />
        <div className="flex flex-wrap gap-2">
          {[target * 0.5, target * 0.75, target, target * 1.25].map((v) => (
            <Button
              key={v}
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setText(String(Math.round(v)))}
            >
              {Math.round(v).toLocaleString()}
            </Button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button type="submit" size="lg" className="flex-1" disabled={!valid}>
            Save
          </Button>
          {initial !== null && (
            <Button
              type="button"
              variant="ghost"
              size="lg"
              onClick={() => onSave(null)}
            >
              Clear
            </Button>
          )}
        </div>
      </form>
    </SheetContent>
  );
}
