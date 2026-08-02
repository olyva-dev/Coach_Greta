"use client";

import { useEffect, useOptimistic, useRef, useTransition } from "react";
import { Check, Clock, RotateCcw, X } from "lucide-react";
import { markOccurrence, type OccurrenceAction } from "@/app/actions/occurrences";
import type { TodayOccurrence } from "@/lib/domain/view";
import type { OccurrenceStatus } from "@/lib/db/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Props {
  dueNow: TodayOccurrence[];
  laterToday: TodayOccurrence[];
  resolved: TodayOccurrence[];
  focusId?: string;
}

const actionToStatus: Record<OccurrenceAction, OccurrenceStatus> = {
  done: "done",
  snooze: "snoozed",
  skip: "skipped",
  undo: "pending",
};

export function OccurrenceList({ dueNow, laterToday, resolved, focusId }: Props) {
  const [, startTransition] = useTransition();
  const [optimistic, applyOptimistic] = useOptimistic(
    new Map<string, OccurrenceStatus>(),
    (state, update: { id: string; status: OccurrenceStatus }) => {
      const next = new Map(state);
      next.set(update.id, update.status);
      return next;
    }
  );

  function mark(id: string, action: OccurrenceAction) {
    startTransition(async () => {
      applyOptimistic({ id, status: actionToStatus[action] });
      await markOccurrence(id, action);
    });
  }

  const focusRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    focusRef.current?.scrollIntoView({ block: "center" });
  }, [focusId]);

  // an optimistically snoozed card stays visible in due now, just relabeled
  const visibleDue = dueNow.filter((o) => {
    const s = optimistic.get(o.occurrence.id);
    return s === undefined || s === "snoozed" || s === "pending";
  });
  const optimisticallyResolved = [...dueNow, ...laterToday].filter((o) => {
    const s = optimistic.get(o.occurrence.id);
    return s === "done" || s === "skipped";
  });

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h2 className="mb-2.5 flex items-center gap-2 text-base font-semibold">
          <span className="h-4 w-1 rounded-full bg-primary" /> Due now
          {visibleDue.length > 0 && (
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
              {visibleDue.length}
            </span>
          )}
        </h2>
        {visibleDue.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface/50 px-4 py-8 text-center">
            <p className="text-2xl">🎉</p>
            <p className="mt-1 text-sm text-muted-foreground">
              All caught up, nothing due right now
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {visibleDue.map((item) => {
              const { occurrence, reminder, timeLabel } = item;
              const snoozed =
                optimistic.get(occurrence.id) === "snoozed" ||
                occurrence.status === "snoozed";
              const isFocus = occurrence.id === focusId;
              return (
                <div
                  key={occurrence.id}
                  ref={isFocus ? focusRef : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border border-primary/25 bg-gradient-to-r from-primary/10 to-surface p-3 animate-fade-in-up",
                    isFocus && "ring-2 ring-ring"
                  )}
                >
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/15 text-2xl">
                    {reminder.emoji ?? "⏰"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{reminder.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {timeLabel}
                      {snoozed && " · snoozed"}
                      {occurrence.notify_count > 1 &&
                        ` · reminded ${occurrence.notify_count} times`}
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    size="icon"
                    aria-label="Snooze"
                    onClick={() => mark(occurrence.id, "snooze")}
                  >
                    <Clock />
                  </Button>
                  <Button
                    size="icon"
                    aria-label="Done"
                    onClick={() => mark(occurrence.id, "done")}
                  >
                    <Check />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {laterToday.filter((o) => !optimistic.has(o.occurrence.id)).length > 0 && (
        <section>
          <h2 className="mb-2.5 flex items-center gap-2 text-base font-semibold">
            <span className="h-4 w-1 rounded-full bg-muted-foreground/40" />{" "}
            Later today
          </h2>
          <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface">
            {laterToday
              .filter((o) => !optimistic.has(o.occurrence.id))
              .map(({ occurrence, reminder, timeLabel }) => (
                <div
                  key={occurrence.id}
                  className="flex items-center gap-3 px-3 py-2"
                >
                  <span className="w-12 shrink-0 font-mono text-xs text-muted-foreground">
                    {timeLabel}
                  </span>
                  <span className="text-base leading-none">
                    {reminder.emoji ?? "⏰"}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {reminder.name}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Mark done early"
                    onClick={() => mark(occurrence.id, "done")}
                  >
                    <Check className="size-3.5" />
                  </Button>
                </div>
              ))}
          </div>
        </section>
      )}

      {(resolved.length > 0 || optimisticallyResolved.length > 0) && (
        <section>
          <h2 className="mb-2.5 flex items-center gap-2 text-base font-semibold">
            <span className="h-4 w-1 rounded-full bg-muted-foreground/40" />{" "}
            Earlier today
          </h2>
          <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface/60">
            {[...resolved, ...optimisticallyResolved].map(
              ({ occurrence, reminder, timeLabel }) => {
                const status =
                  optimistic.get(occurrence.id) ?? occurrence.status;
                return (
                  <div
                    key={occurrence.id}
                    className="flex items-center gap-3 px-3 py-2 text-muted-foreground"
                  >
                    <span className="w-12 shrink-0 font-mono text-xs">
                      {timeLabel}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {reminder.emoji} {reminder.name}
                    </span>
                    <Badge
                      variant={
                        status === "done"
                          ? "default"
                          : status === "missed"
                            ? "destructive"
                            : "muted"
                      }
                    >
                      {status === "done" ? (
                        <Check className="size-3" />
                      ) : (
                        <X className="size-3" />
                      )}
                      {status}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label="Undo"
                      onClick={() => mark(occurrence.id, "undo")}
                    >
                      <RotateCcw className="size-3.5" />
                    </Button>
                  </div>
                );
              }
            )}
          </div>
        </section>
      )}
    </div>
  );
}
