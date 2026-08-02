import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";
import { getTodayData } from "@/lib/data/today";
import { OccurrenceList } from "@/components/today/occurrence-list";
import { ChallengeList } from "@/components/today/challenge-list";
import { HabitList } from "@/components/today/habit-list";

export const metadata = { title: "Today" };
export const dynamic = "force-dynamic";

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ focus?: string }>;
}) {
  const [{ focus }, data] = await Promise.all([searchParams, getTodayData()]);

  const heading = format(
    new TZDate(new Date(), data.profile.timezone),
    "EEEE, MMMM d"
  );

  return (
    <div className="flex flex-col gap-6 py-6">
      <header>
        <h1 className="text-2xl font-bold">Today</h1>
        <p className="text-sm text-muted-foreground">{heading}</p>
      </header>

      <OccurrenceList
        dueNow={data.dueNow}
        laterToday={data.laterToday}
        resolved={data.resolved}
        focusId={focus}
      />
      <ChallengeList challenges={data.challenges} today={data.today} />
      <HabitList habits={data.habits} today={data.today} />
    </div>
  );
}
