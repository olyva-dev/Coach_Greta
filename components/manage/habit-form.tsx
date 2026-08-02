"use client";

import { useState, useTransition } from "react";
import { createHabit, updateHabit, type HabitInput } from "@/app/actions/habits";
import type { Habit, HabitPolarity } from "@/lib/db/types";
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
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(
    habit?.days_of_week ?? [0, 1, 2, 3, 4, 5, 6]
  );
  const [requireExplicit, setRequireExplicit] = useState(
    habit?.require_explicit_check ?? false
  );

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const input: HabitInput = {
      name: name.trim(),
      emoji: emoji.trim() || null,
      polarity,
      daysOfWeek,
      requireExplicitCheck: polarity === "negative" ? requireExplicit : false,
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

          <FormRow label="Type">
            <Select
              value={polarity}
              onChange={(e) => setPolarity(e.target.value as HabitPolarity)}
            >
              <option value="positive">Goal, I want to do this</option>
              <option value="negative">Avoid, checking it means I slipped</option>
            </Select>
          </FormRow>

          {polarity === "negative" && (
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

          <FormRow label="Days">
            <DaysOfWeekPicker value={daysOfWeek} onChange={setDaysOfWeek} />
          </FormRow>

          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            type="submit"
            size="lg"
            disabled={pending || daysOfWeek.length === 0}
          >
            {pending ? "Saving..." : "Save habit"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
