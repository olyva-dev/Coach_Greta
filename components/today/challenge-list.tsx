"use client";

import { useOptimistic, useTransition } from "react";
import { Check, RotateCcw, X } from "lucide-react";
import { clearChallengeLog, logChallengeDay } from "@/app/actions/challenges";
import type { TodayChallenge } from "@/lib/domain/view";
import type { ChallengeLogStatus } from "@/lib/db/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Props {
  challenges: TodayChallenge[];
  today: string;
}

export function ChallengeList({ challenges, today }: Props) {
  const [, startTransition] = useTransition();
  const [optimistic, applyOptimistic] = useOptimistic(
    new Map<string, ChallengeLogStatus | null>(),
    (state, update: { id: string; status: ChallengeLogStatus | null }) => {
      const next = new Map(state);
      next.set(update.id, update.status);
      return next;
    }
  );

  if (challenges.length === 0) return null;

  function set(item: TodayChallenge, status: ChallengeLogStatus | null) {
    startTransition(async () => {
      applyOptimistic({ id: item.challenge.id, status });
      if (status === null) {
        await clearChallengeLog(item.challenge.id, today);
      } else {
        await logChallengeDay({
          challengeId: item.challenge.id,
          localDate: today,
          dayNumber: item.day,
          targetAmount: item.target ?? 0,
          status,
        });
      }
    });
  }

  return (
    <section>
      <h2 className="mb-2.5 flex items-center gap-2 text-base font-semibold">
        <span className="h-4 w-1 rounded-full bg-volt" /> Challenges
      </h2>
      <div className="flex flex-col gap-2">
        {challenges.map((item) => {
          const { challenge, day, target, log } = item;
          const status = optimistic.has(challenge.id)
            ? optimistic.get(challenge.id)
            : (log?.status ?? null);

          return (
            <div
              key={challenge.id}
              className="rounded-xl border border-volt/25 bg-gradient-to-r from-volt/10 to-surface p-3"
            >
              <div className="flex items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-volt/15 text-lg font-bold text-volt">
                  {day}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{challenge.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Day {day} of {challenge.duration_days}
                  </p>
                </div>
                {target === null && <Badge variant="muted">Rest day</Badge>}
                {status !== null && status !== undefined && (
                  <>
                    <Badge variant={status === "done" ? "default" : "muted"}>
                      {status === "done"
                        ? `${target} ${challenge.unit} done`
                        : status}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label="Undo"
                      onClick={() => set(item, null)}
                    >
                      <RotateCcw className="size-3.5" />
                    </Button>
                  </>
                )}
              </div>
              {target !== null && (status === null || status === undefined) && (
                <div className="mt-3 flex items-center gap-3 border-t border-volt/15 pt-3">
                  <p className="min-w-0 flex-1 text-sm">
                    <span className="text-2xl font-bold text-volt">
                      {target}
                    </span>{" "}
                    <span className="text-muted-foreground">
                      {challenge.unit} · {challenge.exercises.join(" + ")}
                    </span>
                  </p>
                  <Button
                    variant="secondary"
                    size="icon"
                    aria-label="Skip"
                    onClick={() => set(item, "skipped")}
                  >
                    <X />
                  </Button>
                  <Button
                    size="icon"
                    aria-label="Done"
                    onClick={() => set(item, "done")}
                  >
                    <Check />
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
