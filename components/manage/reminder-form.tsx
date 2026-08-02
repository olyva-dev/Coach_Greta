"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  createReminder,
  updateReminder,
  type ReminderInput,
} from "@/app/actions/reminders";
import type { Reminder, RetryPolicy, ScheduleKind } from "@/lib/db/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { DaysOfWeekPicker, FormRow } from "@/components/manage/shared";

interface Props {
  reminder?: Reminder;
  trigger: React.ReactNode;
}

export function ReminderForm({ reminder, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(reminder?.name ?? "");
  const [emoji, setEmoji] = useState(reminder?.emoji ?? "");
  const [scheduleKind, setScheduleKind] = useState<ScheduleKind>(
    reminder?.schedule_kind ?? "fixed_times"
  );
  const [times, setTimes] = useState<string[]>(
    reminder?.times?.map((t) => t.slice(0, 5)) ?? ["09:00"]
  );
  const [intervalMinutes, setIntervalMinutes] = useState(
    reminder?.interval_minutes ?? 50
  );
  const [windowStart, setWindowStart] = useState(
    reminder?.window_start?.slice(0, 5) ?? "09:00"
  );
  const [windowEnd, setWindowEnd] = useState(
    reminder?.window_end?.slice(0, 5) ?? "18:00"
  );
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(
    reminder?.days_of_week ?? [0, 1, 2, 3, 4, 5, 6]
  );
  const [retryPolicy, setRetryPolicy] = useState<RetryPolicy>(
    reminder?.retry_policy ?? "once"
  );
  const [retryInterval, setRetryInterval] = useState(
    reminder?.retry_interval_minutes ?? 15
  );
  const [maxRetries, setMaxRetries] = useState(reminder?.max_retries ?? 3);
  const [snoozeMinutes, setSnoozeMinutes] = useState(
    reminder?.snooze_minutes ?? 10
  );

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const input: ReminderInput = {
      name: name.trim(),
      emoji: emoji.trim() || null,
      notes: null,
      scheduleKind,
      times: times.map((t) => `${t}:00`),
      intervalMinutes,
      windowStart: `${windowStart}:00`,
      windowEnd: `${windowEnd}:00`,
      daysOfWeek,
      retryPolicy,
      retryIntervalMinutes: retryInterval,
      maxRetries,
      snoozeMinutes,
    };
    startTransition(async () => {
      try {
        if (reminder) await updateReminder(reminder.id, input);
        else await createReminder(input);
        setOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent title={reminder ? "Edit reminder" : "New reminder"}>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex gap-2">
            <FormRow label="Emoji">
              <Input
                value={emoji}
                onChange={(e) => setEmoji(e.target.value)}
                className="w-16 text-center"
                placeholder="⏰"
              />
            </FormRow>
            <div className="flex-1">
              <FormRow label="Name">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Take medication"
                />
              </FormRow>
            </div>
          </div>

          <FormRow label="Schedule">
            <Select
              value={scheduleKind}
              onChange={(e) =>
                setScheduleKind(e.target.value as ScheduleKind)
              }
            >
              <option value="fixed_times">At fixed times</option>
              <option value="interval">Every X minutes in a window</option>
            </Select>
          </FormRow>

          {scheduleKind === "fixed_times" ? (
            <FormRow label="Times">
              <div className="flex flex-col gap-2">
                {times.map((t, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={t}
                      required
                      onChange={(e) =>
                        setTimes(
                          times.map((x, j) => (j === i ? e.target.value : x))
                        )
                      }
                    />
                    {times.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Remove time"
                        onClick={() =>
                          setTimes(times.filter((_, j) => j !== i))
                        }
                      >
                        <Trash2 />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setTimes([...times, "12:00"])}
                >
                  <Plus /> Add time
                </Button>
              </div>
            </FormRow>
          ) : (
            <>
              <FormRow label="Every (minutes)">
                <Input
                  type="number"
                  min={5}
                  max={480}
                  value={intervalMinutes}
                  onChange={(e) => setIntervalMinutes(Number(e.target.value))}
                />
              </FormRow>
              <div className="grid grid-cols-2 gap-2">
                <FormRow label="From">
                  <Input
                    type="time"
                    value={windowStart}
                    onChange={(e) => setWindowStart(e.target.value)}
                  />
                </FormRow>
                <FormRow label="Until">
                  <Input
                    type="time"
                    value={windowEnd}
                    onChange={(e) => setWindowEnd(e.target.value)}
                  />
                </FormRow>
              </div>
            </>
          )}

          <FormRow label="Days">
            <DaysOfWeekPicker value={daysOfWeek} onChange={setDaysOfWeek} />
          </FormRow>

          <FormRow label="If I do not respond">
            <Select
              value={retryPolicy}
              onChange={(e) => setRetryPolicy(e.target.value as RetryPolicy)}
            >
              <option value="once">Notify once, no follow up</option>
              <option value="one_retry">Remind me one more time</option>
              <option value="repeat">Keep reminding me</option>
            </Select>
          </FormRow>

          {retryPolicy !== "once" && (
            <div className="grid grid-cols-2 gap-2">
              <FormRow label="Minutes between reminders">
                <Input
                  type="number"
                  min={5}
                  max={240}
                  value={retryInterval}
                  onChange={(e) => setRetryInterval(Number(e.target.value))}
                />
              </FormRow>
              {retryPolicy === "repeat" && (
                <FormRow label="Max follow ups">
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={maxRetries}
                    onChange={(e) => setMaxRetries(Number(e.target.value))}
                  />
                </FormRow>
              )}
            </div>
          )}

          <FormRow label="Snooze length (minutes)">
            <Input
              type="number"
              min={5}
              max={240}
              value={snoozeMinutes}
              onChange={(e) => setSnoozeMinutes(Number(e.target.value))}
            />
          </FormRow>

          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" size="lg" disabled={pending || daysOfWeek.length === 0}>
            {pending ? "Saving..." : "Save reminder"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
