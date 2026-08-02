// Hand-maintained database types matching supabase/migrations.
// After schema changes you can regenerate with:
//   supabase gen types typescript --linked > lib/db/generated.ts
// and reconcile, but this file is the source of truth for the app.

export type ScheduleKind = "fixed_times" | "interval";
export type RetryPolicy = "once" | "one_retry" | "repeat";
export type ItemStatus = "active" | "paused" | "archived";
export type OccurrenceStatus =
  | "pending"
  | "notified"
  | "snoozed"
  | "done"
  | "skipped"
  | "missed";
export type ProgressionKind = "linear" | "fixed" | "custom";
export type ChallengeLogStatus = "done" | "partial" | "skipped";
export type HabitPolarity = "positive" | "negative";
export type DeliveryStatus = "sent" | "failed";

export type Profile = {
  id: string;
  display_name: string | null;
  timezone: string;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  week_starts_on: number;
  created_at: string;
  updated_at: string;
}

export type Reminder = {
  id: string;
  user_id: string;
  name: string;
  emoji: string | null;
  notes: string | null;
  schedule_kind: ScheduleKind;
  times: string[] | null;
  interval_minutes: number | null;
  window_start: string | null;
  window_end: string | null;
  days_of_week: number[];
  retry_policy: RetryPolicy;
  retry_interval_minutes: number;
  max_retries: number;
  snooze_minutes: number;
  status: ItemStatus;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type ReminderOccurrence = {
  id: string;
  user_id: string;
  reminder_id: string;
  local_date: string;
  scheduled_for: string;
  notify_after: string | null;
  notify_count: number;
  last_notified_at: string | null;
  status: OccurrenceStatus;
  completed_at: string | null;
}

export type Challenge = {
  id: string;
  user_id: string;
  name: string;
  exercises: string[];
  unit: string;
  start_date: string;
  duration_days: number;
  progression_kind: ProgressionKind;
  start_amount: number | null;
  increment: number;
  max_amount: number | null;
  custom_amounts: number[] | null;
  rest_days: number[];
  status: ItemStatus;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type ChallengeLog = {
  id: string;
  user_id: string;
  challenge_id: string;
  local_date: string;
  day_number: number;
  target_amount: number;
  status: ChallengeLogStatus;
  completed_amount: number | null;
  note: string | null;
  created_at: string;
}

export type HabitKind = "boolean" | "numeric";
export type HabitScheduleKind = "days_of_week" | "cycle";

export type Habit = {
  id: string;
  user_id: string;
  name: string;
  emoji: string | null;
  polarity: HabitPolarity;
  days_of_week: number[];
  require_explicit_check: boolean;
  kind: HabitKind;
  target_value: number | null;
  unit: string | null;
  schedule_kind: HabitScheduleKind;
  cycle_on_days: number | null;
  cycle_off_days: number | null;
  cycle_anchor_date: string | null;
  status: ItemStatus;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type HabitLog = {
  id: string;
  user_id: string;
  habit_id: string;
  local_date: string;
  value: boolean;
  amount: number | null;
  logged_at: string;
}

export type PushSubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  device_label: string | null;
  user_agent: string | null;
  enabled: boolean;
  failure_count: number;
  last_success_at: string | null;
  last_error: string | null;
  created_at: string;
  last_seen_at: string | null;
}

export type NotificationDelivery = {
  id: string;
  user_id: string;
  occurrence_id: string;
  subscription_id: string | null;
  status: DeliveryStatus;
  http_status: number | null;
  error: string | null;
  sent_at: string;
}

type TableDef<Row, Required extends keyof Row, Generated extends keyof Row> = {
  Row: Row;
  Insert: Pick<Row, Required> & Partial<Omit<Row, Required | Generated>>;
  Update: Partial<Omit<Row, Generated>>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: TableDef<Profile, "id", "created_at" | "updated_at">;
      reminders: TableDef<
        Reminder,
        "user_id" | "name" | "schedule_kind",
        "id" | "created_at" | "updated_at"
      >;
      reminder_occurrences: TableDef<
        ReminderOccurrence,
        "user_id" | "reminder_id" | "local_date" | "scheduled_for",
        "id"
      >;
      challenges: TableDef<
        Challenge,
        | "user_id"
        | "name"
        | "exercises"
        | "start_date"
        | "duration_days"
        | "progression_kind",
        "id" | "created_at" | "updated_at"
      >;
      challenge_logs: TableDef<
        ChallengeLog,
        | "user_id"
        | "challenge_id"
        | "local_date"
        | "day_number"
        | "target_amount"
        | "status",
        "id" | "created_at"
      >;
      habits: TableDef<
        Habit,
        "user_id" | "name" | "polarity",
        "id" | "created_at" | "updated_at"
      >;
      habit_logs: TableDef<
        HabitLog,
        "user_id" | "habit_id" | "local_date" | "value",
        "id"
      >;
      push_subscriptions: TableDef<
        PushSubscriptionRow,
        "user_id" | "endpoint" | "p256dh" | "auth",
        "id" | "created_at"
      >;
      notification_deliveries: TableDef<
        NotificationDelivery,
        "user_id" | "occurrence_id" | "status",
        "id" | "sent_at"
      >;
    };
    Views: Record<string, never>;
    Functions: {
      apply_notification_action: {
        Args: { p_occurrence_id: string; p_action: string };
        Returns: undefined;
      };
      refresh_my_schedules: { Args: Record<string, never>; Returns: undefined };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
