"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, LogOut, UserRound } from "lucide-react";
import { exportAllData } from "@/app/actions/settings";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AccountPanel({ email }: { email: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function exportData() {
    setMessage(null);
    startTransition(async () => {
      try {
        const json = await exportAllData();
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `coach-greta-export-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } catch {
        setMessage("Export failed");
      }
    });
  }

  function signOut() {
    startTransition(async () => {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserRound className="size-4 text-primary" /> Account
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">{email}</p>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={exportData} disabled={pending}>
            <Download /> Export my data
          </Button>
          <Button variant="ghost" onClick={signOut} disabled={pending}>
            <LogOut /> Sign out
          </Button>
        </div>
        {message && <p className="text-sm text-destructive">{message}</p>}
      </CardContent>
    </Card>
  );
}
