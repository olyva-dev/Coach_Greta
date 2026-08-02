import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { setReminderStatus } from "@/app/actions/reminders";
import { ReminderForm } from "@/components/manage/reminder-form";
import { StatusActions, StatusBadge } from "@/components/manage/shared";
import { Button } from "@/components/ui/button";
import { BackLink } from "@/components/back-link";
import type { Reminder } from "@/lib/db/types";

export const metadata = { title: "Reminders" };
export const dynamic = "force-dynamic";

function describeSchedule(r: Reminder): string {
  const days =
    r.days_of_week.length === 7
      ? "daily"
      : r.days_of_week.length === 5 &&
          !r.days_of_week.includes(0) &&
          !r.days_of_week.includes(6)
        ? "weekdays"
        : `${r.days_of_week.length} days a week`;
  if (r.schedule_kind === "fixed_times") {
    return `${(r.times ?? []).map((t) => t.slice(0, 5)).join(", ")} · ${days}`;
  }
  return `every ${r.interval_minutes} min, ${r.window_start?.slice(0, 5)} to ${r.window_end?.slice(0, 5)} · ${days}`;
}

export default async function RemindersPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reminders")
    .select("*")
    .order("status")
    .order("sort_order");
  const reminders = data ?? [];

  return (
    <div className="flex flex-col gap-4 py-6">
      <BackLink href="/manage" />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Reminders</h1>
        <ReminderForm
          trigger={
            <Button size="sm">
              <Plus /> New
            </Button>
          }
        />
      </div>

      {reminders.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
          No reminders yet
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {reminders.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3"
            >
              <span className="text-xl leading-none">{r.emoji ?? "⏰"}</span>
              <ReminderForm
                reminder={r}
                trigger={
                  <button className="min-w-0 flex-1 text-left">
                    <p className="truncate font-medium">
                      {r.name} <StatusBadge status={r.status} />
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {describeSchedule(r)}
                    </p>
                  </button>
                }
              />
              <StatusActions
                status={r.status}
                onSet={async (s) => {
                  "use server";
                  await setReminderStatus(r.id, s);
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
