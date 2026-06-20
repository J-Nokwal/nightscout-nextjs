"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { NightscoutLogo } from "@/components/NightscoutLogo";

export default function LoginPage() {
  const router = useRouter();
  const [secret, setSecret]     = useState("");
  const [error, setError]       = useState("");
  const [attempts, setAttempts] = useState(0);
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      apiSecret: secret,
      redirect: false,
    });

    setLoading(false);
    if (result?.error) {
      setAttempts((n) => n + 1);
      setError("Invalid API secret");
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-3">
        <div className="flex flex-col items-center gap-2 mb-2">
          <NightscoutLogo size={64} />
          <span className="text-xl font-bold tracking-tight">Nightscout</span>
          <span className="text-xs text-muted-foreground">CGM Remote Monitor</span>
        </div>
        <Card>
          <CardHeader>
            <p className="text-sm text-muted-foreground">Sign in with your API secret</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="secret">API Secret</Label>
                <Input
                  id="secret"
                  type="password"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  placeholder="Enter your API secret"
                  autoFocus
                  required
                />
              </div>
              {error && (
                <div className="space-y-1">
                  <p className="text-sm text-destructive">{error}</p>
                  {attempts >= 2 && (
                    <p className="text-xs text-muted-foreground">
                      The API secret is set in the <code className="bg-muted px-1 rounded">API_SECRET</code>{" "}
                      environment variable.{" "}
                      <Link href="/register" className="underline hover:text-foreground">
                        First-time setup?
                      </Link>
                    </p>
                  )}
                </div>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in…" : "Sign in"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          New installation?{" "}
          <Link href="/register" className="underline hover:text-foreground">
            Setup guide
          </Link>
        </p>
        <p className="text-center text-xs text-muted-foreground">
          <Link href="/disclaimer" className="underline hover:text-foreground">
            Medical Disclaimer
          </Link>
          {" · "}Not a medical device · Use at your own risk
        </p>
      </div>
    </div>
  );
}
