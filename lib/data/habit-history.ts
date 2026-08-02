import { format, parseISO, subDays } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { localToday } from "@/lib/domain/schedule";
import { isScheduledOn } from "@/lib/domain/habits";
import type { Habit } from "@/lib/db/types";

export interface BackfillDay {
  date: string;
  label: string;
  scheduled: boolean;
  value: boolean | null;
  amount: number | null;
}

export interface HabitBackfill {
  habit: Habit;
  days: BackfillDay[];
}

// The last N days for every active habit, so amounts recorded late (step
// counts especially) can be filled in after the fact.
export async function getBackfill(days = 7): Promise<{
  today: string;
  habits: HabitBackfill[];
}> {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone")
    .single();
  const timezone = profile?.timezone ?? "America/Bogota";
  const today = localToday(timezone);
  const from = format(subDays(parseISO(today), days - 1), "yyyy-MM-dd");

  const [{ data: habits }, { data: logs }] = await Promise.all([
    supabase
      .from("habits")
      .select("*")
      .eq("status", "active")
      .order("sort_order"),
    supabase.from("habit_logs").select("*").gte("local_date", from),
  ]);

  const logsByHabit = new Map<string, Map<string, { value: boolean; amount: number | null }>>();
  for (const log of logs ?? []) {
    let m = logsByHabit.get(log.habit_id);
    if (!m) {
      m = new Map();
      logsByHabit.set(log.habit_id, m);
    }
    m.set(log.local_date, { value: log.value, amount: log.amount });
  }

  return {
    today,
    habits: (habits ?? []).map((habit) => {
      const logged = logsByHabit.get(habit.id);
      const dayList: BackfillDay[] = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = format(subDays(parseISO(today), i), "yyyy-MM-dd");
        const entry = logged?.get(date);
        dayList.push({
          date,
          label:
            date === today
              ? "Today"
              : format(parseISO(date), i === 1 ? "'Yesterday'" : "EEE d"),
          scheduled: isScheduledOn(habit, date),
          value: entry?.value ?? null,
          amount: entry?.amount ?? null,
        });
      }
      return { habit, days: dayList };
    }),
  };
}
