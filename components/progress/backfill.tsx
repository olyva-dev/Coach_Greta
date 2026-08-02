"use client";

import { useState, useTransition } from "react";
import { Check, Minus, X } from "lucide-react";
import { setHabitLog } from "@/app/actions/habits";
import type { HabitBackfill } from "@/lib/data/habit-history";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Fill in the last week after the fact. Step counts especially arrive a day
// or two late, and a missing number should not silently cost a streak.
export function Backfill({ habits }: { habits: HabitBackfill[] }) {
  if (habits.length === 0) return null;
  return (
    <Card id="backfill" className="scroll-mt-4">
      <CardHeader>
        <CardTitle>Catch up on the last week</CardTitle>
        <p className="text-xs text-muted-foreground">
          Record days you missed at the time. Numbers can be added late.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {habits.map((entry) => (
          <HabitRow key={entry.habit.id} entry={entry} />
        ))}
      </CardContent>
    </Card>
  );
}

function HabitRow({ entry }: { entry: HabitBackfill }) {
  const { habit, days } = entry;
  const [, startTransition] = useTransition();
  const [local, setLocal] = useState(days);

  function updateDay(
    date: string,
    patch: { value?: boolean | null; amount?: number | null }
  ) {
    setLocal((prev) =>
      prev.map((d) =>
        d.date === date
          ? {
              ...d,
              value:
                patch.amount !== undefined
                  ? patch.amount === null
                    ? null
                    : patch.amount >= (habit.target_value ?? 0)
                  : (patch.value ?? null),
              amount: patch.amount !== undefined ? patch.amount : d.amount,
            }
          : d
      )
    );
    startTransition(async () => {
      await setHabitLog(habit.id, date, patch);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">
        {habit.emoji} {habit.name}
        {habit.kind === "numeric" && (
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            target {(habit.target_value ?? 0).toLocaleString()} {habit.unit}
          </span>
        )}
      </p>
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {local.map((day) => (
          <div key={day.date} className="flex w-16 shrink-0 flex-col gap-1">
            <span className="text-center text-[10px] text-muted-foreground">
              {day.label}
            </span>
            {!day.scheduled ? (
              <div className="grid h-9 place-items-center rounded-md border border-dashed border-border text-muted-foreground">
                <Minus className="size-3" />
              </div>
            ) : habit.kind === "numeric" ? (
              <Input
                type="number"
                inputMode="numeric"
                defaultValue={day.amount ?? ""}
                placeholder="–"
                onBlur={(e) => {
                  const raw = e.target.value.trim();
                  const next = raw === "" ? null : Number(raw);
                  if (next !== day.amount) updateDay(day.date, { amount: next });
                }}
                className={cn(
                  "h-9 px-1 text-center text-xs",
                  day.value === true && "border-lime/50 bg-lime/10 text-lime"
                )}
              />
            ) : (
              <button
                onClick={() =>
                  updateDay(day.date, {
                    value: day.value === true ? null : true,
                  })
                }
                className={cn(
                  "grid h-9 place-items-center rounded-md border transition-colors",
                  day.value === true
                    ? "border-lime/50 bg-lime/12 text-lime"
                    : day.value === false
                      ? "border-destructive/50 bg-destructive/12 text-destructive"
                      : "border-border bg-surface-raised text-muted-foreground"
                )}
                aria-label={`${habit.name} on ${day.label}`}
              >
                {day.value === true ? (
                  <Check className="size-4" />
                ) : day.value === false ? (
                  <X className="size-4" />
                ) : (
                  <Minus className="size-3" />
                )}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
