import Link from "next/link";
import { Bell, ChevronRight, Dumbbell, ListChecks, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { MODULES } from "@/lib/modules/registry";

export const metadata = { title: "Manage" };
export const dynamic = "force-dynamic";

export default async function ManagePage() {
  const supabase = await createClient();
  const [rem, ch, hab] = await Promise.all([
    supabase
      .from("reminders")
      .select("id", { count: "exact", head: true })
      .neq("status", "archived"),
    supabase
      .from("challenges")
      .select("id", { count: "exact", head: true })
      .neq("status", "archived"),
    supabase
      .from("habits")
      .select("id", { count: "exact", head: true })
      .neq("status", "archived"),
  ]);

  const sections = [
    {
      href: "/manage/reminders",
      icon: Bell,
      title: "Reminders",
      description: "Scheduled notifications",
      count: rem.count ?? 0,
    },
    {
      href: "/manage/challenges",
      icon: TrendingUp,
      title: "Challenges",
      description: "Progressive daily targets",
      count: ch.count ?? 0,
    },
    {
      href: "/manage/habits",
      icon: ListChecks,
      title: "Habits",
      description: "Daily yes or no checklist",
      count: hab.count ?? 0,
    },
    {
      href: "/modules",
      icon: Dumbbell,
      title: "Guided modules",
      description: "Exercises with step by step coaching",
      count: MODULES.length,
    },
  ];

  const accents = [
    { chip: "bg-volt/15 text-volt", border: "hover:border-volt/40" },
    { chip: "bg-volt/15 text-volt", border: "hover:border-volt/40" },
    { chip: "bg-gold/15 text-gold", border: "hover:border-gold/40" },
    { chip: "bg-accent/15 text-accent", border: "hover:border-accent/40" },
  ];

  return (
    <div className="flex flex-col gap-6 py-6">
      <h1 className="text-3xl font-bold">Manage</h1>
      <div className="grid gap-3 lg:grid-cols-2">
        {sections.map(({ href, icon: Icon, title, description, count }, i) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-4 rounded-xl border border-border bg-surface p-4 transition-colors hover:bg-surface-raised lg:flex-col lg:items-start lg:gap-3 lg:p-5 ${accents[i].border}`}
          >
            <span
              className={`grid size-11 shrink-0 place-items-center rounded-xl ${accents[i].chip}`}
            >
              <Icon className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">
                {title}{" "}
                <span className="ml-1 text-sm font-normal text-muted-foreground">
                  {count}
                </span>
              </p>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
            <ChevronRight className="size-4 text-muted-foreground lg:hidden" />
          </Link>
        ))}
      </div>
    </div>
  );
}
