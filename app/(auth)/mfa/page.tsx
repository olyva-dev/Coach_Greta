"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function MfaPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();

    const { data: factors, error: listError } =
      await supabase.auth.mfa.listFactors();
    const totp = factors?.totp?.[0];
    if (listError || !totp) {
      setError("No authenticator found on this account");
      setLoading(false);
      return;
    }

    const { data: challenge, error: challengeError } =
      await supabase.auth.mfa.challenge({ factorId: totp.id });
    if (challengeError || !challenge) {
      setError("Could not start verification, try again");
      setLoading(false);
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: totp.id,
      challengeId: challenge.id,
      code: code.trim(),
    });
    if (verifyError) {
      setError("Wrong code, try again");
      setLoading(false);
      setCode("");
      inputRef.current?.focus();
      return;
    }

    router.push("/today");
    router.refresh();
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 pb-safe">
      <div className="w-full max-w-sm animate-fade-in-up">
        <div className="mb-8 text-center">
          <div className="text-4xl mb-3">🔐</div>
          <h1 className="text-2xl font-bold">Two factor check</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Enter the 6 digit code from your authenticator app
          </p>
        </div>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="code">Code</Label>
            <Input
              id="code"
              ref={inputRef}
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              className="text-center text-2xl tracking-[0.5em] font-mono"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" size="lg" disabled={loading || code.length !== 6}>
            {loading ? "Verifying..." : "Verify"}
          </Button>
        </form>
      </div>
    </main>
  );
}
