import { notFound } from "next/navigation";
import { format, parseISO } from "date-fns";
import { AlertTriangle, BookOpen, ExternalLink } from "lucide-react";
import { getModule } from "@/lib/modules/registry";
import { createClient } from "@/lib/supabase/server";
import { localToday } from "@/lib/domain/schedule";
import { ModuleRunner } from "@/components/modules/module-runner";
import { BackLink } from "@/components/back-link";
import { StatTile } from "@/components/ui/stat";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  const mod = getModule(key);
  return { title: mod?.name ?? "Module" };
}

export default async function ModulePage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<{ occurrence?: string; level?: string }>;
}) {
  const [{ key }, { occurrence, level }] = await Promise.all([
    params,
    searchParams,
  ]);
  const mod = getModule(key);
  if (!mod) notFound();

  const supabase = await createClient();
  const [{ data: profile }, { data: sessions }] = await Promise.all([
    supabase.from("profiles").select("timezone").single(),
    supabase
      .from("exercise_sessions")
      .select("*")
      .eq("module_key", key)
      .order("started_at", { ascending: false })
      .limit(30),
  ]);

  const today = localToday(profile?.timezone ?? "America/Bogota");
  const all = sessions ?? [];
  const completed = all.filter((s) => s.status === "completed");
  const todayCount = completed.filter((s) => s.local_date === today).length;
  const totalReps = completed.reduce((s, x) => s + x.reps_completed, 0);
  const lastLevel = all[0]?.level_key ?? mod.defaultLevelKey;

  return (
    <div className="mx-auto w-full max-w-2xl flex flex-col gap-4 py-6">
      <BackLink href="/today" />

      <header>
        <p className="text-4xl">{mod.emoji}</p>
        <h1 className="mt-1 text-3xl font-bold">{mod.name}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{mod.summary}</p>
      </header>

      <div className="grid grid-cols-3 gap-3">
        <StatTile value={todayCount} label="Sessions today" />
        <StatTile value={completed.length} label="Sessions logged" />
        <StatTile value={totalReps.toLocaleString()} label="Total reps" />
      </div>

      <ModuleRunner
        module={mod}
        initialLevelKey={level ?? lastLevel}
        occurrenceId={occurrence}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="size-4 text-volt" /> How to do it
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {mod.howTo.map((s, i) => (
            <div key={s.title} className="flex gap-3">
              <span className="metric grid size-7 shrink-0 place-items-center rounded-full bg-volt/15 text-xs font-bold text-volt">
                {i + 1}
              </span>
              <div>
                <p className="text-sm font-medium">{s.title}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                  {s.body}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-warning/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-warning" /> Get this wrong and
            it will not work
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-2">
            {mod.cautions.map((c) => (
              <li
                key={c}
                className="flex gap-2 text-sm leading-relaxed text-muted-foreground"
              >
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-warning" />
                {c}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {mod.sources.length > 0 && (
        <div className="rounded-md border border-border bg-surface p-4">
          <p className="text-xs font-semibold text-muted-foreground">
            This protocol follows
          </p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {mod.sources.map((s) => (
              <li key={s.url}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm text-volt hover:underline"
                >
                  {s.label} <ExternalLink className="size-3 shrink-0" />
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            General guidance, not medical advice for your situation. If you have
            symptoms or a diagnosis, follow what your own clinician tells you.
          </p>
        </div>
      )}

      {completed.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent sessions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col divide-y divide-border">
            {completed.slice(0, 8).map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between gap-3 py-2 text-sm"
              >
                <span>
                  {s.local_date === today
                    ? "Today"
                    : format(parseISO(s.local_date), "EEE d MMM")}
                </span>
                <span className="text-xs text-muted-foreground">
                  {s.level_key} · {s.reps_completed} reps ·{" "}
                  {Math.round(s.duration_seconds / 60)} min
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
