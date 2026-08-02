"use client";

import { useState, useTransition } from "react";
import { createHabit, updateHabit, type HabitInput } from "@/app/actions/habits";
import type {
  Habit,
  HabitKind,
  HabitPolarity,
  HabitScheduleKind,
} from "@/lib/db/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { DaysOfWeekPicker, FormRow } from "@/components/manage/shared";

interface Props {
  habit?: Habit;
  trigger: React.ReactNode;
}

export function HabitForm({ habit, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(habit?.name ?? "");
  const [emoji, setEmoji] = useState(habit?.emoji ?? "");
  const [polarity, setPolarity] = useState<HabitPolarity>(
    habit?.polarity ?? "positive"
  );
  const [kind, setKind] = useState<HabitKind>(habit?.kind ?? "boolean");
  const [targetValue, setTargetValue] = useState(
    habit?.target_value != null ? String(habit.target_value) : "10000"
  );
  const [unit, setUnit] = useState(habit?.unit ?? "steps");
  const [scheduleKind, setScheduleKind] = useState<HabitScheduleKind>(
    habit?.schedule_kind ?? "days_of_week"
  );
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(
    habit?.days_of_week ?? [0, 1, 2, 3, 4, 5, 6]
  );
  const [cycleOn, setCycleOn] = useState(habit?.cycle_on_days ?? 3);
  const [cycleOff, setCycleOff] = useState(habit?.cycle_off_days ?? 1);
  const [cycleAnchor, setCycleAnchor] = useState(
    habit?.cycle_anchor_date ?? new Date().toISOString().slice(0, 10)
  );
  const [requireExplicit, setRequireExplicit] = useState(
    habit?.require_explicit_check ?? false
  );

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsedTarget = Number(targetValue);
    if (kind === "numeric" && (!Number.isFinite(parsedTarget) || parsedTarget <= 0)) {
      setError("Set a target greater than zero");
      return;
    }
    const input: HabitInput = {
      name: name.trim(),
      emoji: emoji.trim() || null,
      polarity,
      kind,
      targetValue: kind === "numeric" ? parsedTarget : null,
      unit: kind === "numeric" ? unit.trim() || null : null,
      scheduleKind,
      daysOfWeek,
      cycleOnDays: scheduleKind === "cycle" ? cycleOn : null,
      cycleOffDays: scheduleKind === "cycle" ? cycleOff : null,
      cycleAnchorDate: scheduleKind === "cycle" ? cycleAnchor : null,
      requireExplicitCheck: requireExplicit,
    };
    startTransition(async () => {
      try {
        if (habit) await updateHabit(habit.id, input);
        else await createHabit(input);
        setOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent title={habit ? "Edit habit" : "New habit"}>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex gap-2">
            <FormRow label="Emoji">
              <Input
                value={emoji}
                onChange={(e) => setEmoji(e.target.value)}
                className="w-16 text-center"
                placeholder="✅"
              />
            </FormRow>
            <div className="flex-1">
              <FormRow label="Name">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Gym"
                />
              </FormRow>
            </div>
          </div>

          <FormRow label="How do you track it">
            <Select
              value={kind}
              onChange={(e) => setKind(e.target.value as HabitKind)}
            >
              <option value="boolean">Yes or no</option>
              <option value="numeric">A number I record (steps, minutes)</option>
            </Select>
          </FormRow>

          {kind === "numeric" ? (
            <div className="grid grid-cols-2 gap-2">
              <FormRow label="Daily target">
                <Input
                  type="number"
                  min={1}
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                />
              </FormRow>
              <FormRow label="Unit">
                <Input
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="steps"
                />
              </FormRow>
            </div>
          ) : (
            <FormRow label="Type">
              <Select
                value={polarity}
                onChange={(e) => setPolarity(e.target.value as HabitPolarity)}
              >
                <option value="positive">Goal, I want to do this</option>
                <option value="negative">
                  Avoid, checking it means I slipped
                </option>
              </Select>
            </FormRow>
          )}

          {kind === "boolean" && polarity === "negative" && (
            <label className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface-raised px-3 py-2.5">
              <span className="text-sm">
                Require a daily confirmation
                <span className="block text-xs text-muted-foreground">
                  Off: an untouched day counts as clean. On: I must confirm
                  each day, silence breaks the streak.
                </span>
              </span>
              <Switch
                checked={requireExplicit}
                onCheckedChange={setRequireExplicit}
              />
            </label>
          )}

          <FormRow label="Schedule">
            <Select
              value={scheduleKind}
              onChange={(e) =>
                setScheduleKind(e.target.value as HabitScheduleKind)
              }
            >
              <option value="days_of_week">Certain days of the week</option>
              <option value="cycle">A repeating cycle (3 on, 1 off)</option>
            </Select>
          </FormRow>

          {scheduleKind === "days_of_week" ? (
            <FormRow label="Days">
              <DaysOfWeekPicker value={daysOfWeek} onChange={setDaysOfWeek} />
            </FormRow>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                <FormRow label="Days on">
                  <Input
                    type="number"
                    min={1}
                    max={30}
                    value={cycleOn}
                    onChange={(e) => setCycleOn(Number(e.target.value))}
                  />
                </FormRow>
                <FormRow label="Days off">
                  <Input
                    type="number"
                    min={0}
                    max={30}
                    value={cycleOff}
                    onChange={(e) => setCycleOff(Number(e.target.value))}
                  />
                </FormRow>
              </div>
              <FormRow label="Cycle starts on">
                <Input
                  type="date"
                  value={cycleAnchor}
                  onChange={(e) => setCycleAnchor(e.target.value)}
                />
              </FormRow>
              <p className="rounded-md bg-surface-raised px-3 py-2 text-xs text-muted-foreground">
                {cycleOn} day{cycleOn > 1 ? "s" : ""} on, then {cycleOff} off,
                repeating from {cycleAnchor}. Change the start date any time to
                resync the cycle to how you are actually training.
              </p>
            </>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            type="submit"
            size="lg"
            disabled={
              pending ||
              (scheduleKind === "days_of_week" && daysOfWeek.length === 0)
            }
          >
            {pending ? "Saving..." : "Save habit"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
