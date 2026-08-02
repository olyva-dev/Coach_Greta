"use client";

import { useTransition } from "react";
import { Archive, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ItemStatus } from "@/lib/db/types";

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

export function DaysOfWeekPicker({
  value,
  onChange,
}: {
  value: number[];
  onChange: (days: number[]) => void;
}) {
  return (
    <div className="flex gap-1.5">
      {DAY_LABELS.map((label, dow) => {
        const active = value.includes(dow);
        return (
          <button
            key={dow}
            type="button"
            aria-label={`Day ${dow}`}
            aria-pressed={active}
            onClick={() =>
              onChange(
                active
                  ? value.filter((d) => d !== dow)
                  : [...value, dow].sort()
              )
            }
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-full border text-sm font-medium transition-colors",
              active
                ? "border-primary/50 bg-primary/15 text-primary"
                : "border-border bg-surface-raised text-muted-foreground"
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function StatusBadge({ status }: { status: ItemStatus }) {
  if (status === "active") return null;
  return (
    <Badge variant={status === "paused" ? "warning" : "muted"}>{status}</Badge>
  );
}

export function StatusActions({
  status,
  onSet,
}: {
  status: ItemStatus;
  onSet: (status: ItemStatus) => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();
  function set(next: ItemStatus) {
    startTransition(async () => {
      await onSet(next);
    });
  }
  return (
    <div className="flex gap-1">
      {status !== "active" && (
        <Button
          variant="ghost"
          size="icon"
          aria-label="Activate"
          disabled={pending}
          onClick={() => set("active")}
        >
          <Play />
        </Button>
      )}
      {status === "active" && (
        <Button
          variant="ghost"
          size="icon"
          aria-label="Pause"
          disabled={pending}
          onClick={() => set("paused")}
        >
          <Pause />
        </Button>
      )}
      {status !== "archived" && (
        <Button
          variant="ghost"
          size="icon"
          aria-label="Archive"
          disabled={pending}
          onClick={() => set("archived")}
        >
          <Archive />
        </Button>
      )}
    </div>
  );
}

export function FormRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}
