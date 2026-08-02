import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { setChallengeStatus } from "@/app/actions/challenges";
import { ChallengeForm } from "@/components/manage/challenge-form";
import { StatusActions, StatusBadge } from "@/components/manage/shared";
import { Button } from "@/components/ui/button";
import { BackLink } from "@/components/back-link";
import { localToday } from "@/lib/domain/schedule";
import { dayNumber, targetForDay } from "@/lib/domain/challenge";
import type { Challenge } from "@/lib/db/types";

export const metadata = { title: "Challenges" };
export const dynamic = "force-dynamic";

function describeProgression(c: Challenge): string {
  switch (c.progression_kind) {
    case "linear":
      return `starts at ${c.start_amount}, +${c.increment} per day${
        c.max_amount != null ? `, capped at ${c.max_amount}` : ""
      }`;
    case "fixed":
      return `${c.start_amount} ${c.unit} every day`;
    case "custom":
      return `custom ladder, ${c.custom_amounts?.length ?? 0} steps`;
  }
}

export default async function ChallengesPage() {
  const supabase = await createClient();
  const [{ data: profile }, { data }] = await Promise.all([
    supabase.from("profiles").select("*").single(),
    supabase
      .from("challenges")
      .select("*")
      .order("status")
      .order("sort_order"),
  ]);
  const challenges = data ?? [];
  const today = localToday(profile?.timezone ?? "America/Bogota");

  return (
    <div className="mx-auto w-full max-w-2xl flex flex-col gap-4 py-6">
      <BackLink href="/manage" />
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Challenges</h1>
        <ChallengeForm
          trigger={
            <Button size="sm">
              <Plus /> New
            </Button>
          }
        />
      </div>

      {challenges.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
          No challenges yet
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {challenges.map((c) => {
            const day = dayNumber(c, today);
            const within = day >= 1 && day <= c.duration_days;
            return (
              <div
                key={c.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3"
              >
                <ChallengeForm
                  challenge={c}
                  trigger={
                    <button className="min-w-0 flex-1 text-left">
                      <p className="truncate font-medium">
                        {c.name} <StatusBadge status={c.status} />
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {within
                          ? `day ${day} of ${c.duration_days}, today ${targetForDay(c, day)} ${c.unit}`
                          : day < 1
                            ? `starts ${c.start_date}`
                            : "finished"}
                        {" · "}
                        {describeProgression(c)}
                      </p>
                    </button>
                  }
                />
                <StatusActions
                  status={c.status}
                  onSet={async (s) => {
                    "use server";
                    await setChallengeStatus(c.id, s);
                  }}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
