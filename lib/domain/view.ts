// Plain view model types shared by server data assembly and client components
import type {
  Challenge,
  ChallengeLog,
  Habit,
  HabitLog,
  Reminder,
  ReminderOccurrence,
} from "@/lib/db/types";

export interface TodayOccurrence {
  occurrence: ReminderOccurrence;
  reminder: Reminder;
  timeLabel: string;
}

export interface TodayChallenge {
  challenge: Challenge;
  day: number;
  target: number | null; // null = rest day
  log: ChallengeLog | null;
}

export interface TodayHabit {
  habit: Habit;
  log: HabitLog | null;
}
