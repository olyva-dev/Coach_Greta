import { Flame, Trophy } from "lucide-react";
import { getProgressData } from "@/lib/data/progress";
import { Heatmap, HeatmapLegend } from "@/components/progress/heatmap";
import { ProgressRing } from "@/components/progress/ring";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Progress" };
export const dynamic = "force-dynamic";

export default async function ProgressPage() {
  const data = await getProgressData();

  // week summary
  const weekWins = data.habits.reduce((s, h) => s + h.weekWins, 0);
  const weekPossible = data.habits.reduce((s, h) => s + h.weekPossible, 0);
  const withAdherence = data.reminders.filter((r) => r.adherencePct !== null);
  const avgAdherence =
    withAdherence.length > 0
      ? Math.round(
          withAdherence.reduce((s, r) => s + (r.adherencePct ?? 0), 0) /
            withAdherence.length
        )
      : null;
  const bestStreak = data.habits.reduce((max, h) => Math.max(max, h.current), 0);

  return (
    <div className="flex flex-col gap-6 py-6">
      <header>
        <h1 className="text-2xl font-bold">Progress</h1>
        <p className="text-sm text-muted-foreground">
          Streaks and history at a glance
        </p>
      </header>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg border border-border bg-surface p-3 text-center">
          <p className="text-xl font-bold">
            {weekWins}
            <span className="text-sm font-normal text-muted-foreground">
              /{weekPossible}
            </span>
          </p>
          <p className="text-xs text-muted-foreground">habit wins this week</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-3 text-center">
          <p className="text-xl font-bold">
            {avgAdherence !== null ? `${avgAdherence}%` : "–"}
          </p>
          <p className="text-xs text-muted-foreground">reminders done, 30 days</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-3 text-center">
          <p className="flex items-center justify-center gap-1 text-xl font-bold">
            <Flame className="size-4 text-warning" /> {bestStreak}
          </p>
          <p className="text-xs text-muted-foreground">longest live streak</p>
        </div>
      </div>

      {data.challenges.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Challenges
          </h2>
          {data.challenges.map(
            ({ challenge, day, doneDays, skippedDays, totalVolume }) => (
              <Card key={challenge.id}>
                <CardContent className="flex items-center gap-4 p-4">
                  <ProgressRing
                    fraction={day / challenge.duration_days}
                    label={`${day}`}
                    sublabel={`of ${challenge.duration_days}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{challenge.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {challenge.exercises.join(" + ")}
                    </p>
                    <p className="mt-1 text-sm">
                      <Trophy className="mr-1 inline size-3.5 text-warning" />
                      {totalVolume} {challenge.unit} total · {doneDays} days
                      done
                      {skippedDays > 0 && ` · ${skippedDays} skipped`}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )
          )}
        </section>
      )}

      {data.habits.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Habits
          </h2>
          {data.habits.map(({ habit, current, best, cells }) => (
            <Card key={habit.id}>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>
                  {habit.emoji} {habit.name}
                </CardTitle>
                <p className="text-sm">
                  <Flame className="mr-0.5 inline size-4 text-warning" />
                  <span className="font-bold">{current}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    best {best}
                  </span>
                </p>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <Heatmap cells={cells} />
              </CardContent>
            </Card>
          ))}
          <HeatmapLegend />
        </section>
      )}

      {data.reminders.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Reminders, last 30 days
          </h2>
          <div className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
            {data.reminders.map(({ reminder, done, missed, adherencePct }) => (
              <div key={reminder.id} className="flex items-center gap-3 p-3">
                <span className="text-base leading-none">
                  {reminder.emoji ?? "⏰"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{reminder.name}</p>
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-surface-raised">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${adherencePct ?? 0}%` }}
                    />
                  </div>
                </div>
                <p className="w-20 text-right text-sm">
                  {adherencePct !== null ? (
                    <>
                      <span className="font-semibold">{adherencePct}%</span>
                      <span className="block text-[10px] text-muted-foreground">
                        {done} done · {missed} missed
                      </span>
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      no history yet
                    </span>
                  )}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
