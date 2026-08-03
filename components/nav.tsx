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
import { Logo } from "@/components/logo";

const items = [
  { href: "/today", label: "Today", icon: CalendarCheck },
  { href: "/progress", label: "Progress", icon: TrendingUp },
  { href: "/manage", label: "Manage", icon: ListChecks },
  { href: "/settings", label: "Settings", icon: Settings },
];

// Floating pill: the active item expands into a filled volt chip
export function BottomNav() {
  const pathname = usePathname();
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:hidden">
      <nav className="flex items-center gap-1 rounded-full border border-border bg-surface/90 p-1.5 shadow-lg backdrop-blur-md">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3.5 py-2.5 text-sm font-medium transition-all",
                active
                  ? "bg-volt text-volt-foreground"
                  : "text-muted-foreground"
              )}
            >
              <Icon className="size-5" />
              {active && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function SideNav() {
  const pathname = usePathname();
  return (
    <nav className="hidden md:flex md:w-56 md:flex-col md:gap-1 md:border-r md:border-border md:p-4 md:shrink-0">
      <div className="flex items-center gap-2.5 px-3 pb-8 pt-2">
        <span className="grid size-9 place-items-center rounded-xl bg-volt/15 text-volt">
          <Logo size={20} />
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
              "flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-volt text-volt-foreground"
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
