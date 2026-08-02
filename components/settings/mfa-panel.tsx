"use client";

import { useEffect, useState, useTransition } from "react";
import { ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Factor = { id: string; friendly_name?: string; status: string };

export function MfaPanel() {
  const [pending, startTransition] = useTransition();
  const [factors, setFactors] = useState<Factor[]>([]);
  const [enrolling, setEnrolling] = useState<{
    factorId: string;
    qr: string;
    secret: string;
  } | null>(null);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function refresh() {
    const supabase = createClient();
    const { data } = await supabase.auth.mfa.listFactors();
    setFactors((data?.totp ?? []) as Factor[]);
  }

  useEffect(() => {
    let alive = true;
    createClient()
      .auth.mfa.listFactors()
      .then(({ data }) => {
        if (alive) setFactors((data?.totp ?? []) as Factor[]);
      });
    return () => {
      alive = false;
    };
  }, []);

  function startEnroll() {
    setMessage(null);
    startTransition(async () => {
      const supabase = createClient();
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Authenticator app",
      });
      if (error || !data) {
        setMessage(error?.message ?? "Could not start enrollment");
        return;
      }
      setEnrolling({
        factorId: data.id,
        qr: data.totp.qr_code,
        secret: data.totp.secret,
      });
    });
  }

  function verifyEnroll(e: React.FormEvent) {
    e.preventDefault();
    if (!enrolling) return;
    startTransition(async () => {
      const supabase = createClient();
      const { data: challenge, error: challengeError } =
        await supabase.auth.mfa.challenge({ factorId: enrolling.factorId });
      if (challengeError || !challenge) {
        setMessage("Could not verify, try again");
        return;
      }
      const { error } = await supabase.auth.mfa.verify({
        factorId: enrolling.factorId,
        challengeId: challenge.id,
        code: code.trim(),
      });
      if (error) {
        setMessage("Wrong code, try again");
        return;
      }
      setEnrolling(null);
      setCode("");
      setMessage("Two factor is on. You will be asked for a code at sign in.");
      await refresh();
    });
  }

  function unenroll(factorId: string) {
    setMessage(null);
    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) {
        setMessage(
          "Could not remove: verify with a code first by signing in again"
        );
        return;
      }
      await refresh();
      setMessage("Two factor removed");
    });
  }

  const verified = factors.filter((f) => f.status === "verified");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-primary" /> Two factor
          authentication
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {verified.length === 0 && !enrolling && (
          <>
            <p className="text-sm text-muted-foreground">
              Protect your health data with a second factor from an
              authenticator app.
            </p>
            <Button onClick={startEnroll} disabled={pending}>
              Set up two factor
            </Button>
          </>
        )}

        {enrolling && (
          <form onSubmit={verifyEnroll} className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Scan with your authenticator app, then enter the code it shows.
            </p>
            <div className="self-center rounded-lg bg-white p-3">
              {/* qr_code is an SVG data url from Supabase */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={enrolling.qr} alt="TOTP QR code" width={180} height={180} />
            </div>
            <p className="break-all text-center font-mono text-xs text-muted-foreground">
              {enrolling.secret}
            </p>
            <Input
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              className="text-center font-mono"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            />
            <div className="flex gap-2">
              <Button type="submit" disabled={pending || code.length !== 6}>
                Verify
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  if (enrolling) unenroll(enrolling.factorId);
                  setEnrolling(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}

        {verified.map((f) => (
          <div
            key={f.id}
            className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2.5"
          >
            <span className="text-sm">
              {f.friendly_name ?? "Authenticator app"}
              <span className="ml-2 text-xs text-primary">active</span>
            </span>
            <Button
              variant="destructive"
              size="sm"
              disabled={pending}
              onClick={() => unenroll(f.id)}
            >
              Remove
            </Button>
          </div>
        ))}

        {message && <p className="text-sm text-muted-foreground">{message}</p>}
      </CardContent>
    </Card>
  );
}
