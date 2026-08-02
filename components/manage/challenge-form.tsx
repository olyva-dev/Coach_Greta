"use client";

import { useState, useTransition } from "react";
import {
  createChallenge,
  updateChallenge,
  type ChallengeInput,
} from "@/app/actions/challenges";
import type { Challenge, ProgressionKind } from "@/lib/db/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { DaysOfWeekPicker, FormRow } from "@/components/manage/shared";
import { targetForDay } from "@/lib/domain/challenge";

interface Props {
  challenge?: Challenge;
  trigger: React.ReactNode;
}

export function ChallengeForm({ challenge, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(challenge?.name ?? "");
  const [exercises, setExercises] = useState(
    challenge?.exercises.join(", ") ?? ""
  );
  const [unit, setUnit] = useState(challenge?.unit ?? "reps");
  const [startDate, setStartDate] = useState(
    challenge?.start_date ?? new Date().toISOString().slice(0, 10)
  );
  const [durationDays, setDurationDays] = useState(
    challenge?.duration_days ?? 30
  );
  const [progressionKind, setProgressionKind] = useState<ProgressionKind>(
    challenge?.progression_kind ?? "linear"
  );
  const [startAmount, setStartAmount] = useState(challenge?.start_amount ?? 1);
  const [increment, setIncrement] = useState(challenge?.increment ?? 1);
  const [maxAmount, setMaxAmount] = useState<string>(
    challenge?.max_amount != null ? String(challenge.max_amount) : ""
  );
  const [customAmounts, setCustomAmounts] = useState(
    challenge?.custom_amounts?.join(", ") ?? ""
  );
  // rest days are stored as days of week NOT trained
  const [trainingDays, setTrainingDays] = useState<number[]>(
    [0, 1, 2, 3, 4, 5, 6].filter((d) => !(challenge?.rest_days ?? []).includes(d))
  );

  function buildInput(): ChallengeInput | string {
    const exerciseList = exercises
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (exerciseList.length === 0) return "Add at least one exercise";

    let custom: number[] | null = null;
    if (progressionKind === "custom") {
      custom = customAmounts
        .split(",")
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isFinite(n) && n > 0);
      if (custom.length === 0) return "Add the daily amounts, comma separated";
    }

    return {
      name: name.trim(),
      exercises: exerciseList,
      unit: unit.trim() || "reps",
      startDate,
      durationDays,
      progressionKind,
      startAmount: progressionKind === "custom" ? null : startAmount,
      increment: progressionKind === "linear" ? increment : 0,
      maxAmount:
        progressionKind === "linear" && maxAmount !== ""
          ? Number(maxAmount)
          : null,
      customAmounts: custom,
      restDays: [0, 1, 2, 3, 4, 5, 6].filter((d) => !trainingDays.includes(d)),
    };
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const input = buildInput();
    if (typeof input === "string") {
      setError(input);
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        if (challenge) await updateChallenge(challenge.id, input);
        else await createChallenge(input);
        setOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  // live preview of the ladder
  const previewChallenge = {
    progression_kind: progressionKind,
    start_amount: startAmount,
    increment,
    max_amount: maxAmount !== "" ? Number(maxAmount) : null,
    custom_amounts: customAmounts
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n) && n > 0),
  } as Parameters<typeof targetForDay>[0];
  const previewDays = [1, 7, 15, durationDays].filter(
    (d, i, a) => d >= 1 && d <= durationDays && a.indexOf(d) === i
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent title={challenge ? "Edit challenge" : "New challenge"}>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <FormRow label="Name">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Squats and pushups"
            />
          </FormRow>

          <FormRow label="Exercises (comma separated)">
            <Input
              value={exercises}
              onChange={(e) => setExercises(e.target.value)}
              required
              placeholder="squats, pushups"
            />
          </FormRow>

          <div className="grid grid-cols-2 gap-2">
            <FormRow label="Start date">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </FormRow>
            <FormRow label="Duration (days)">
              <Input
                type="number"
                min={1}
                max={365}
                value={durationDays}
                onChange={(e) => setDurationDays(Number(e.target.value))}
              />
            </FormRow>
          </div>

          <FormRow label="Progression">
            <Select
              value={progressionKind}
              onChange={(e) =>
                setProgressionKind(e.target.value as ProgressionKind)
              }
            >
              <option value="linear">Grows with the day number</option>
              <option value="fixed">Same amount every day</option>
              <option value="custom">Custom amounts per day</option>
            </Select>
          </FormRow>

          {progressionKind !== "custom" ? (
            <div className="grid grid-cols-3 gap-2">
              <FormRow label="Day 1 amount">
                <Input
                  type="number"
                  min={1}
                  value={startAmount}
                  onChange={(e) => setStartAmount(Number(e.target.value))}
                />
              </FormRow>
              {progressionKind === "linear" && (
                <>
                  <FormRow label="Daily increase">
                    <Input
                      type="number"
                      min={0}
                      value={increment}
                      onChange={(e) => setIncrement(Number(e.target.value))}
                    />
                  </FormRow>
                  <FormRow label="Cap (optional)">
                    <Input
                      type="number"
                      min={1}
                      value={maxAmount}
                      onChange={(e) => setMaxAmount(e.target.value)}
                      placeholder="none"
                    />
                  </FormRow>
                </>
              )}
            </div>
          ) : (
            <FormRow label="Amounts per day (comma separated)">
              <Input
                value={customAmounts}
                onChange={(e) => setCustomAmounts(e.target.value)}
                placeholder="5, 10, 15, 20"
              />
            </FormRow>
          )}

          <FormRow label="Training days">
            <DaysOfWeekPicker value={trainingDays} onChange={setTrainingDays} />
          </FormRow>

          <FormRow label="Unit">
            <Input
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="reps"
            />
          </FormRow>

          <div className="rounded-md bg-surface-raised px-3 py-2 text-xs text-muted-foreground">
            {previewDays
              .map((d) => `day ${d}: ${targetForDay(previewChallenge, d)}`)
              .join(" · ")}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            type="submit"
            size="lg"
            disabled={pending || trainingDays.length === 0}
          >
            {pending ? "Saving..." : "Save challenge"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
