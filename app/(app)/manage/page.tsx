import Link from "next/link";
import { Bell, ChevronRight, ListChecks, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

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
  ];

  return (
    <div className="flex flex-col gap-6 py-6">
      <h1 className="text-2xl font-bold">Manage</h1>
      <div className="flex flex-col gap-2">
        {sections.map(({ href, icon: Icon, title, description, count }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-4 rounded-lg border border-border bg-surface p-4 transition-colors hover:bg-surface-raised"
          >
            <Icon className="size-5 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="font-medium">{title}</p>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
            <span className="text-sm text-muted-foreground">{count}</span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </Link>
        ))}
      </div>
    </div>
  );
}
