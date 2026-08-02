"use client";

import { useMemo, useState, useTransition } from "react";
import { Clock } from "lucide-react";
import { updateProfile } from "@/app/actions/settings";
import type { Profile } from "@/lib/db/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormRow } from "@/components/manage/shared";

export function ProfileForm({ profile }: { profile: Profile }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState(profile.display_name ?? "");
  const [timezone, setTimezone] = useState(profile.timezone);
  const [quietEnabled, setQuietEnabled] = useState(
    profile.quiet_hours_start !== null
  );
  const [quietStart, setQuietStart] = useState(
    profile.quiet_hours_start?.slice(0, 5) ?? "22:00"
  );
  const [quietEnd, setQuietEnd] = useState(
    profile.quiet_hours_end?.slice(0, 5) ?? "07:00"
  );
  const [weekStartsOn, setWeekStartsOn] = useState(profile.week_starts_on);

  const timezones = useMemo<string[]>(() => {
    try {
      return Intl.supportedValuesOf("timeZone");
    } catch {
      return [profile.timezone];
    }
  }, [profile.timezone]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      try {
        await updateProfile({
          displayName: displayName.trim() || null,
          timezone,
          quietHoursStart: quietEnabled ? quietStart : null,
          quietHoursEnd: quietEnabled ? quietEnd : null,
          weekStartsOn,
        });
        setMessage("Saved");
      } catch (err) {
        setMessage(err instanceof Error ? err.message : "Could not save");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="size-4 text-primary" /> Time and schedule
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <FormRow label="Your name">
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Carlos"
              maxLength={40}
            />
          </FormRow>

          <FormRow label="Timezone">
            <Select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            >
              {timezones.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </Select>
          </FormRow>

          <label className="flex items-center justify-between gap-3">
            <span className="text-sm">
              Quiet hours
              <span className="block text-xs text-muted-foreground">
                Reminders due in this window wait until it ends
              </span>
            </span>
            <Switch checked={quietEnabled} onCheckedChange={setQuietEnabled} />
          </label>

          {quietEnabled && (
            <div className="grid grid-cols-2 gap-2">
              <FormRow label="From">
                <Input
                  type="time"
                  value={quietStart}
                  onChange={(e) => setQuietStart(e.target.value)}
                />
              </FormRow>
              <FormRow label="Until">
                <Input
                  type="time"
                  value={quietEnd}
                  onChange={(e) => setQuietEnd(e.target.value)}
                />
              </FormRow>
            </div>
          )}

          <FormRow label="Week starts on">
            <Select
              value={String(weekStartsOn)}
              onChange={(e) => setWeekStartsOn(Number(e.target.value))}
            >
              <option value="1">Monday</option>
              <option value="0">Sunday</option>
            </Select>
          </FormRow>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : "Save"}
            </Button>
            {message && (
              <span className="text-sm text-muted-foreground">{message}</span>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
