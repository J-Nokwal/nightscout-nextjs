"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { loadSettings } from "@/lib/nightscout/settings";
import type { EntryType } from "@/types/nightscout";

export function ManualEntryForm() {
  const router = useRouter();
  const settings = loadSettings();

  const [entryType, setEntryType] = useState<EntryType>("mbg");
  const [value,     setValue]     = useState("");
  const [device,    setDevice]    = useState("manual");
  const [useNow,    setUseNow]    = useState(true);
  const [retroDate, setRetroDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!value) { setError("Enter a BG value"); return; }
    setSaving(true);
    setError("");

    const ts = useNow ? Date.now() : new Date(retroDate).getTime();
    const numVal = parseFloat(value);

    // Convert mmol → mg/dL for storage if settings are mmol
    const mgdlVal = settings.unit === "mmol" ? Math.round(numVal * 18.01559) : numVal;

    const body: Record<string, unknown> = {
      type: entryType,
      date: ts,
      dateString: new Date(ts).toISOString(),
      device,
    };
    if (entryType === "mbg") body.mbg = mgdlVal;
    if (entryType === "sgv") body.sgv = mgdlVal;

    try {
      const res = await fetch("/api/v3/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([body]),
      });
      if (!res.ok) throw new Error(await res.text());
      router.push("/treatments");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const unitLabel = settings.unit === "mmol" ? "mmol/L" : "mg/dL";

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={submit} className="space-y-5">
          <div className="space-y-1.5">
            <Label>Entry Type</Label>
            <Select value={entryType} onValueChange={(v) => v && setEntryType(v as EntryType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mbg">Manual BG (mbg) — finger-stick</SelectItem>
                <SelectItem value="sgv">Sensor BG (sgv) — CGM reading</SelectItem>
                <SelectItem value="cal">Calibration (cal)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              mbg = manual meter reading, sgv = sensor glucose, cal = calibration entry
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Blood Glucose ({unitLabel})</Label>
            <Input
              type="number"
              step={settings.unit === "mmol" ? "0.1" : "1"}
              min={settings.unit === "mmol" ? "1" : "20"}
              max={settings.unit === "mmol" ? "33" : "600"}
              placeholder={settings.unit === "mmol" ? "e.g. 6.5" : "e.g. 120"}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label>Device / Source</Label>
            <Input
              value={device}
              onChange={(e) => setDevice(e.target.value)}
              placeholder="manual, meter, etc."
            />
          </div>

          <div className="space-y-2 border rounded-lg p-3 bg-muted/30">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Log for current time</Label>
              <Switch checked={useNow} onCheckedChange={setUseNow} />
            </div>
            {!useNow && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Date &amp; time</Label>
                <Input
                  type="datetime-local"
                  value={retroDate}
                  onChange={(e) => setRetroDate(e.target.value)}
                  max={new Date().toISOString().slice(0, 16)}
                />
              </div>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-3">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Log Entry"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
