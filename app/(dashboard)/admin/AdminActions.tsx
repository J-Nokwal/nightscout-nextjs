"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Status = "idle" | "running" | "done" | "error";

function ActionRow({
  label, description, danger, onRun,
}: {
  label: string;
  description: string;
  danger?: boolean;
  onRun: () => Promise<void>;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [msg, setMsg] = useState("");

  async function run() {
    if (danger && !confirm(`${label} — are you sure? This cannot be undone.`)) return;
    setStatus("running");
    setMsg("");
    try {
      await onRun();
      setStatus("done");
    } catch (e) {
      setStatus("error");
      setMsg(e instanceof Error ? e.message : "Unknown error");
    }
    setTimeout(() => setStatus("idle"), 5000);
  }

  return (
    <div className="flex items-center justify-between gap-4 px-6 py-3 border-b last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
        {msg && <p className="text-xs text-destructive mt-0.5">{msg}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {status === "done" && <Badge className="bg-green-600 text-white text-xs">Done ✓</Badge>}
        {status === "error" && <Badge variant="destructive" className="text-xs">Error</Badge>}
        <Button
          variant={danger ? "destructive" : "outline"}
          size="sm"
          onClick={run}
          disabled={status === "running"}
        >
          {status === "running" ? "Running…" : label}
        </Button>
      </div>
    </div>
  );
}

export function AdminActions() {
  async function clearAnnouncements() {
    const res = await fetch("/api/v3/treatments?eventType=Announcement", { method: "GET" });
    const items = await res.json();
    for (const t of items) {
      await fetch(`/api/v3/treatments/${t._id}`, { method: "DELETE" });
    }
  }

  async function exportEntries() {
    window.open("/api/v3/entries/export?format=json&days=90", "_blank");
  }

  async function testSSE() {
    const es = new EventSource("/api/sse");
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => { es.close(); reject(new Error("Timeout — no SSE heartbeat")); }, 5000);
      es.onopen = () => { clearTimeout(timeout); es.close(); resolve(); };
      es.onerror = () => { clearTimeout(timeout); es.close(); reject(new Error("SSE connection failed")); };
    });
  }

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Actions</CardTitle></CardHeader>
      <CardContent className="p-0 overflow-hidden">
        <ActionRow
          label="Export entries (90d)"
          description="Download last 90 days of CGM entries as JSON"
          onRun={exportEntries}
        />
        <ActionRow
          label="Clear announcements"
          description="Delete all Announcement treatments from the database"
          danger
          onRun={clearAnnouncements}
        />
        <ActionRow
          label="Test SSE connection"
          description="Verify the real-time event stream /api/sse is working"
          onRun={testSSE}
        />
      </CardContent>
    </Card>
  );
}
