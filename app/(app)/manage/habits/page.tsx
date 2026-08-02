import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { setHabitStatus } from "@/app/actions/habits";
import { HabitForm } from "@/components/manage/habit-form";
import { StatusActions, StatusBadge } from "@/components/manage/shared";
import { Button } from "@/components/ui/button";
import { BackLink } from "@/components/back-link";

export const metadata = { title: "Habits" };
export const dynamic = "force-dynamic";

export default async function HabitsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("habits")
    .select("*")
    .order("status")
    .order("sort_order");
  const habits = data ?? [];

  return (
    <div className="flex flex-col gap-4 py-6">
      <BackLink href="/manage" />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Habits</h1>
        <HabitForm
          trigger={
            <Button size="sm">
              <Plus /> New
            </Button>
          }
        />
      </div>

      {habits.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
          No habits yet
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {habits.map((h) => (
            <div
              key={h.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3"
            >
              <span className="text-xl leading-none">{h.emoji ?? "✅"}</span>
              <HabitForm
                habit={h}
                trigger={
                  <button className="min-w-0 flex-1 text-left">
                    <p className="truncate font-medium">
                      {h.name} <StatusBadge status={h.status} />
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {h.polarity === "positive" ? "goal" : "avoid"}
                      {h.require_explicit_check && " · daily confirmation"}
                      {h.days_of_week.length < 7 &&
                        ` · ${h.days_of_week.length} days a week`}
                    </p>
                  </button>
                }
              />
              <StatusActions
                status={h.status}
                onSet={async (s) => {
                  "use server";
                  await setHabitStatus(h.id, s);
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
