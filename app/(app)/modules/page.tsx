import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { MODULES } from "@/lib/modules/registry";
import { sessionReps } from "@/lib/modules/types";
import { createClient } from "@/lib/supabase/server";
import { localToday } from "@/lib/domain/schedule";
import { BackLink } from "@/components/back-link";

export const metadata = { title: "Guided modules" };
export const dynamic = "force-dynamic";

export default async function ModulesPage() {
  const supabase = await createClient();
  const [{ data: profile }, { data: sessions }] = await Promise.all([
    supabase.from("profiles").select("timezone").single(),
    supabase
      .from("exercise_sessions")
      .select("module_key, local_date, status")
      .eq("status", "completed"),
  ]);
  const today = localToday(profile?.timezone ?? "America/Bogota");

  return (
    <div className="mx-auto w-full max-w-2xl flex flex-col gap-4 py-6">
      <BackLink href="/manage" />
      <div>
        <h1 className="text-3xl font-bold">Guided modules</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Exercises that walk you through each rep instead of just reminding
          you they exist.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {MODULES.map((m) => {
          const done = (sessions ?? []).filter((s) => s.module_key === m.key);
          const todayCount = done.filter((s) => s.local_date === today).length;
          const defaultLevel =
            m.levels.find((l) => l.key === m.defaultLevelKey) ?? m.levels[0];
          return (
            <Link
              key={m.key}
              href={`/modules/${m.key}`}
              className="flex items-center gap-4 rounded-md border border-border bg-surface p-4 transition-colors hover:border-volt/40"
            >
              <span className="grid size-12 shrink-0 place-items-center rounded-md bg-volt/12 text-2xl">
                {m.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{m.name}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                  {m.summary}
                </p>
                <p className="mt-1.5 text-xs">
                  <span className="text-volt">
                    {todayCount > 0
                      ? `${todayCount} today`
                      : `${sessionReps(defaultLevel)} reps a session`}
                  </span>
                  <span className="text-muted-foreground">
                    {" "}
                    · {done.length} logged
                  </span>
                </p>
              </div>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
