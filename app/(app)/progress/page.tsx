import { Flame, Trophy } from "lucide-react";
import { getProgressData } from "@/lib/data/progress";
import { getBackfill } from "@/lib/data/habit-history";
import { Heatmap, HeatmapLegend } from "@/components/progress/heatmap";
import { Backfill } from "@/components/progress/backfill";
import { ProgressRing } from "@/components/progress/ring";
import { ArcGauge, BarSpark, GradientBar, StatTile } from "@/components/ui/stat";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Progress" };
export const dynamic = "force-dynamic";

export default async function ProgressPage() {
  const [data, backfill] = await Promise.all([
    getProgressData(),
    getBackfill(7),
  ]);

  const weekWins = data.habits.reduce((s, h) => s + h.weekWins, 0);
  const weekPossible = data.habits.reduce((s, h) => s + h.weekPossible, 0);
  const weekFraction = weekPossible === 0 ? 0 : weekWins / weekPossible;
  const withAdherence = data.reminders.filter((r) => r.adherencePct !== null);
  const avgAdherence =
    withAdherence.length > 0
      ? Math.round(
          withAdherence.reduce((s, r) => s + (r.adherencePct ?? 0), 0) /
            withAdherence.length
        )
      : null;
  const liveStreak = data.habits.reduce((max, h) => Math.max(max, h.current), 0);
  const earnedBadges = data.badges.filter((b) => b.earned);
  const nextBadge = data.badges.find((b) => !b.earned);

  return (
    <div className="flex flex-col gap-4 py-6">
      <h1 className="text-3xl font-bold">Progress</h1>

      {/* level hero */}
      <div className="rounded-lg border border-border bg-surface p-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">
              Level {data.level.level}
            </p>
            <p className="text-gradient-lime metric mt-0.5 text-4xl font-bold">
              {data.level.title}
            </p>
          </div>
          <p className="shrink-0 text-right text-xs text-muted-foreground">
            <span className="metric block text-lg font-bold text-foreground">
              {data.xp.toLocaleString()}
            </span>
            total xp
          </p>
        </div>
        <GradientBar fraction={data.level.progress} className="mt-4" />
        <p className="mt-2 text-xs text-muted-foreground">
          {data.level.xpForLevel - data.level.xpIntoLevel} xp to level{" "}
          {data.level.level + 1}
        </p>
      </div>

      {/* headline metrics */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          value={liveStreak}
          unit="days"
          label="Current streak"
          accent="lime"
        >
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Flame className="size-3.5 text-gold" /> best ever{" "}
            {data.bestStreak}
          </p>
        </StatTile>
        <StatTile
          value={`${Math.round(weekFraction * 100)}%`}
          label="Habit wins this week"
          accent="primary"
        >
          <GradientBar fraction={weekFraction} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {weekWins} of {weekPossible}
          </p>
        </StatTile>
        <StatTile
          value={avgAdherence !== null ? `${avgAdherence}%` : "–"}
          label="Reminders done, 30 days"
          accent="accent"
        />
        <StatTile
          value={data.perfectDays}
          unit="days"
          label="Perfect days"
          accent="gold"
        >
          <p className="text-xs text-muted-foreground">
            Everything closed, start to finish
          </p>
        </StatTile>
      </div>

      {/* badges */}
      <Card>
        <CardHeader>
          <CardTitle>Badges</CardTitle>
          {nextBadge && (
            <p className="text-xs text-muted-foreground">
              Next up: {nextBadge.label}, {nextBadge.detail.toLowerCase()}
            </p>
          )}
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {data.badges.map((badge) => (
            <div
              key={badge.id}
              className={
                badge.earned
                  ? "flex items-center gap-2 rounded-full border border-gold/40 bg-gold/12 px-3 py-2 text-xs font-medium text-gold"
                  : "flex items-center gap-2 rounded-full border border-border bg-surface-raised px-3 py-2 text-xs text-muted-foreground opacity-60"
              }
              title={badge.detail}
            >
              <span className={badge.earned ? "" : "grayscale"}>
                {badge.emoji}
              </span>
              {badge.label}
            </div>
          ))}
          {earnedBadges.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Keep a habit alive for three days to earn your first badge.
            </p>
          )}
        </CardContent>
      </Card>

      {data.challenges.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <span className="h-4 w-1 rounded-full bg-accent" /> Challenges
          </h2>
          <div className="grid gap-3 lg:grid-cols-2">
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
                      <p className="metric mt-2 text-2xl font-bold text-lime">
                        {totalVolume.toLocaleString()}
                        <span className="ml-1 font-sans text-xs font-normal text-muted-foreground">
                          {challenge.unit} total
                        </span>
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        <Trophy className="mr-1 inline size-3 text-gold" />
                        {doneDays} days done
                        {skippedDays > 0 && ` · ${skippedDays} skipped`}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )
            )}
          </div>
        </section>
      )}

      {data.habits.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <span className="h-4 w-1 rounded-full bg-lime" /> Habits
          </h2>
          <div className="grid gap-3 lg:grid-cols-2">
            {data.habits.map(
              ({ habit, current, best, cells, recentAmounts, recentHits }) => (
                <Card key={habit.id}>
                  <CardHeader className="flex-row items-center justify-between">
                    <CardTitle>
                      {habit.emoji} {habit.name}
                    </CardTitle>
                    <p className="flex items-baseline gap-1 text-sm">
                      <Flame className="size-4 self-center text-gold" />
                      <span className="metric text-lg font-bold">{current}</span>
                      <span className="text-xs text-muted-foreground">
                        best {best}
                      </span>
                    </p>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3">
                    {habit.kind === "numeric" && (
                      <div>
                        <BarSpark values={recentAmounts} hits={recentHits} />
                        <p className="mt-1.5 text-xs text-muted-foreground">
                          last 14 days · target{" "}
                          {(habit.target_value ?? 0).toLocaleString()}{" "}
                          {habit.unit}
                        </p>
                      </div>
                    )}
                    <Heatmap cells={cells} />
                  </CardContent>
                </Card>
              )
            )}
          </div>
          <HeatmapLegend />
        </section>
      )}

      <Backfill habits={backfill.habits} />

      {data.reminders.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <span className="h-4 w-1 rounded-full bg-primary" /> Reminders, last
            30 days
          </h2>
          <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <div className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
              {data.reminders.map(
                ({ reminder, done, missed, adherencePct }) => (
                  <div key={reminder.id} className="flex items-center gap-3 p-3">
                    <span className="text-base leading-none">
                      {reminder.emoji ?? "⏰"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {reminder.name}
                      </p>
                      <GradientBar
                        fraction={(adherencePct ?? 0) / 100}
                        className="mt-1.5 h-1.5"
                      />
                    </div>
                    <p className="w-20 text-right">
                      {adherencePct !== null ? (
                        <>
                          <span className="metric text-base font-bold">
                            {adherencePct}%
                          </span>
                          <span className="block text-[10px] text-muted-foreground">
                            {done} done · {missed} missed
                          </span>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          no history
                        </span>
                      )}
                    </p>
                  </div>
                )
              )}
            </div>
            {avgAdherence !== null && (
              <Card className="hidden lg:block">
                <CardContent className="p-4">
                  <ArcGauge
                    fraction={avgAdherence / 100}
                    label={`${avgAdherence}%`}
                    caption="Overall"
                  />
                </CardContent>
              </Card>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
