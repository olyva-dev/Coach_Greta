"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarCheck,
  TrendingUp,
  ListChecks,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/today", label: "Today", icon: CalendarCheck },
  { href: "/progress", label: "Progress", icon: TrendingUp },
  { href: "/manage", label: "Manage", icon: ListChecks },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur pb-safe md:hidden">
      <div className="flex">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="size-5" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function SideNav() {
  const pathname = usePathname();
  return (
    <nav className="hidden md:flex md:w-56 md:flex-col md:gap-1 md:border-r md:border-border md:p-4 md:shrink-0">
      <div className="flex items-center gap-2.5 px-3 pb-8 pt-2">
        <span className="grid size-9 place-items-center rounded-xl bg-primary/15 text-lg">
          🏃‍♀️
        </span>
        <span className="font-bold [font-family:var(--font-display)] tracking-tight">
          Coach Greta
        </span>
      </div>
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary/12 text-primary"
                : "text-muted-foreground hover:bg-surface-raised hover:text-foreground"
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
