import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";
import { getTodayData } from "@/lib/data/today";
import { OccurrenceList } from "@/components/today/occurrence-list";
import { ChallengeList } from "@/components/today/challenge-list";
import { HabitList } from "@/components/today/habit-list";
import { GradientBar } from "@/components/ui/stat";

export const metadata = { title: "Today" };
export const dynamic = "force-dynamic";

function greeting(hour: number): string {
  if (hour < 5) return "Still up?";
  if (hour < 12) return "Good morning";
  if (hour < 19) return "Good afternoon";
  return "Good evening";
}

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ focus?: string }>;
}) {
  const [{ focus }, data] = await Promise.all([searchParams, getTodayData()]);

  const localNow = new TZDate(new Date(), data.profile.timezone);
  const dateLabel = format(localNow, "EEEE, MMMM d");

  const dueCount = data.dueNow.length;
  const doneToday = data.resolved.filter(
    (o) => o.occurrence.status === "done"
  ).length;
  const challengesLeft = data.challenges.filter(
    (c) => c.target !== null && c.log === null
  ).length;
  const pct = Math.round(data.dayProgress * 100);

  return (
    <div className="flex flex-col gap-6 py-6">
      <header className="rounded-lg border border-border bg-surface p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">{dateLabel}</p>
            <h1 className="mt-0.5 text-2xl font-bold">
              {greeting(localNow.getHours())}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {data.totalCount === 0
                ? "Nothing scheduled today"
                : pct === 100
                  ? "Your day is complete"
                  : pct >= 60
                    ? "Your day is almost done"
                    : `${data.doneCount} of ${data.totalCount} closed out`}
            </p>
          </div>
          <p className="metric shrink-0 text-4xl font-bold text-lime">{pct}%</p>
        </div>
        <GradientBar fraction={data.dayProgress} className="mt-4" />
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium">
          <span className="rounded-full bg-surface-raised px-3 py-1.5 text-muted-foreground">
            {dueCount === 0 ? "Nothing due right now" : `${dueCount} due now`}
          </span>
          {challengesLeft > 0 && (
            <span className="rounded-full bg-accent/15 px-3 py-1.5 text-accent">
              {challengesLeft} challenge{challengesLeft > 1 ? "s" : ""} pending
            </span>
          )}
          {doneToday > 0 && (
            <span className="rounded-full bg-lime/12 px-3 py-1.5 text-lime">
              {doneToday} done today
            </span>
          )}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
        <OccurrenceList
          dueNow={data.dueNow}
          laterToday={data.laterToday}
          resolved={data.resolved}
          focusId={focus}
        />
        <div className="flex flex-col gap-6">
          <ChallengeList challenges={data.challenges} today={data.today} />
          <HabitList habits={data.habits} today={data.today} />
        </div>
      </div>
    </div>
  );
}
