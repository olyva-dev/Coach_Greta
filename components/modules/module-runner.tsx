"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Play } from "lucide-react";
import { recordSession } from "@/app/actions/sessions";
import type { Module } from "@/lib/modules/types";
import { findLevel, sessionReps, sessionSeconds } from "@/lib/modules/types";
import { SessionPlayer, type SessionResult } from "@/components/modules/session-player";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  module: Module;
  initialLevelKey: string;
  occurrenceId?: string;
}

export function ModuleRunner({ module, initialLevelKey, occurrenceId }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [levelKey, setLevelKey] = useState(initialLevelKey);
  const [running, setRunning] = useState(false);
  const level = findLevel(module, levelKey);

  function handleFinish(result: SessionResult) {
    startTransition(async () => {
      try {
        await recordSession({
          moduleKey: module.key,
          levelKey,
          repsCompleted: result.repsCompleted,
          setsCompleted: result.setsCompleted,
          durationSeconds: result.durationSeconds,
          completed: result.completed,
          occurrenceId: occurrenceId ?? null,
        });
      } catch {
        // a failed write must not eat the session, the player still shows
        // the summary and the user can retry
      }
    });
  }

  if (running) {
    return (
      <SessionPlayer
        module={module}
        level={level}
        onFinish={handleFinish}
        onExit={() => {
          setRunning(false);
          router.refresh();
        }}
      />
    );
  }

  const mins = Math.round(sessionSeconds(level) / 60);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="mb-2 text-sm font-semibold">Choose your level</p>
        <div className="flex flex-col gap-2">
          {module.levels.map((l) => (
            <button
              key={l.key}
              onClick={() => setLevelKey(l.key)}
              className={cn(
                "rounded-md border p-3 text-left transition-colors",
                l.key === levelKey
                  ? "border-volt/50 bg-volt/8"
                  : "border-border bg-surface hover:border-volt/25"
              )}
            >
              <p className="flex items-center justify-between gap-2 text-sm font-medium">
                {l.name}
                <span className="shrink-0 text-xs font-normal text-muted-foreground">
                  {sessionReps(l)} reps ·{" "}
                  {Math.max(1, Math.round(sessionSeconds(l) / 60))} min
                </span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {l.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-md border border-border bg-surface p-4">
        <p className="text-sm font-medium">{level.name} session</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {sessionReps(level)} reps, about {Math.max(1, mins)} minute
          {mins > 1 ? "s" : ""}. Guidance says {level.timesPerDay}.
        </p>
      </div>

      <Button size="lg" className="h-14 text-base" onClick={() => setRunning(true)}>
        <Play className="fill-current" /> Start session
      </Button>
    </div>
  );
}
