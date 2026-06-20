"use client";

import { useEffect } from "react";
import { NightscoutLogo } from "@/components/NightscoutLogo";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-8 text-center">
      <NightscoutLogo size={56} />
      <div className="space-y-2">
        <h1 className="text-4xl font-bold">Something went wrong</h1>
        <p className="text-sm text-muted-foreground max-w-sm">
          An unexpected error occurred. Your CGM device and data are unaffected — this is a display error only.
          Always check your CGM device directly for current glucose readings.
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground font-mono">Error ID: {error.digest}</p>
        )}
      </div>
      <button
        onClick={reset}
        className="text-sm underline underline-offset-4 text-primary hover:text-primary/80"
      >
        Try again
      </button>
    </div>
  );
}
