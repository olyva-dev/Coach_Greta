import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";
import { Bell, CheckCheck, Flame, Target } from "lucide-react";
import Link from "next/link";
import { getTodayData } from "@/lib/data/today";
import { OccurrenceList } from "@/components/today/occurrence-list";
import { ChallengeList } from "@/components/today/challenge-list";
import { HabitList } from "@/components/today/habit-list";
import { RingGauge, StatTile } from "@/components/ui/stat";

export const metadata = { title: "Today" };
export const dynamic = "force-dynamic";

function greeting(hour: number): string {
  if (hour < 5) return "Still up";
  if (hour < 12) return "Good morning";
  if (hour < 19) return "Good afternoon";
  return "Good evening";
}

function statusFor(pct: number, total: number): string {
  if (total === 0) return "Nothing due";
  if (pct === 100) return "Complete";
  if (pct >= 75) return "Almost there";
  if (pct >= 40) return "On track";
  return "Just getting started";
}

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ focus?: string }>;
}) {
  const [{ focus }, data] = await Promise.all([searchParams, getTodayData()]);

  const localNow = new TZDate(new Date(), data.profile.timezone);
  const dateLabel = format(localNow, "EEEE, MMMM d");
  const pct = Math.round(data.dayProgress * 100);

  const dueCount = data.dueNow.length;
  const doneToday = data.resolved.filter(
    (o) => o.occurrence.status === "done"
  ).length;
  const challengesLeft = data.challenges.filter(
    (c) => c.target !== null && c.log === null
  ).length;
  const name = data.profile.display_name;

  return (
    <div className="flex flex-col gap-4 py-6">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{dateLabel}</p>
          <h1 className="mt-0.5 text-3xl font-bold">
            {greeting(localNow.getHours())}
            {name ? (
              <>
                <br />
                <span className="text-volt">{name}</span> 👋
              </>
            ) : (
              " 👋"
            )}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {pct === 100
              ? "Everything closed out. Nice."
              : "Ready to beat yesterday?"}
          </p>
        </div>
        <Link
          href="/settings"
          aria-label="Notification settings"
          className="grid size-11 shrink-0 place-items-center rounded-full border border-border bg-surface text-muted-foreground transition-colors hover:text-foreground"
        >
          <Bell className="size-5" />
        </Link>
      </header>

      {/* hero: the day as a single dial */}
      <div className="flex flex-col items-center gap-4 rounded-lg border border-border bg-surface p-6">
        <RingGauge
          fraction={data.dayProgress}
          value={`${pct}%`}
          caption="Today"
          status={statusFor(pct, data.totalCount)}
        />
        <p className="text-sm text-muted-foreground">
          {data.doneCount} of {data.totalCount} closed out
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatTile
          value={dueCount}
          label="Due now"
          icon={<Bell />}
          unit={dueCount === 1 ? "item" : "items"}
        />
        <StatTile
          value={doneToday}
          label="Done today"
          icon={<CheckCheck />}
          unit={doneToday === 1 ? "item" : "items"}
        />
        <StatTile
          value={challengesLeft}
          label="Challenges left"
          icon={<Target />}
        />
      </div>

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

      {pct === 100 && data.totalCount > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-volt/40 bg-volt/8 p-4">
          <Flame className="size-5 shrink-0 text-volt" />
          <p className="text-sm">
            <span className="font-semibold">Perfect day.</span>{" "}
            <span className="text-muted-foreground">
              Everything scheduled is closed out.
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
