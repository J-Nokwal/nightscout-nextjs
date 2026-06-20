"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { loadSettings, saveSettings, DEFAULT_SETTINGS } from "@/lib/nightscout/settings";
import type { NightscoutSettings } from "@/lib/nightscout/settings";
import { loadDashboardConfig, saveDashboardConfig, DASHBOARD_DEFAULTS } from "@/lib/nightscout/dashboardConfig";
import type { DashboardConfig } from "@/lib/nightscout/dashboardConfig";
import { playAlarm } from "@/lib/nightscout/alarmAudio";
import { useRef } from "react";

const ALARM_KEYS = ["urgentLow", "low", "high", "urgentHigh", "stale"] as const;
const ALARM_LABELS: Record<string, string> = {
  urgentLow: "Urgent Low", low: "Low", high: "High", urgentHigh: "Urgent High", stale: "Stale data",
};
const ALARM_COLORS: Record<string, string> = {
  urgentLow: "bg-red-700", low: "bg-orange-500", high: "bg-yellow-500",
  urgentHigh: "bg-red-500", stale: "bg-gray-600",
};

const PLUGIN_LABELS: Record<string, string> = {
  iob: "IOB", cob: "COB", noise: "Noise", upbat: "Uploader Battery",
  sage: "SAGE (sensor age)", cage: "CAGE (cannula age)",
  iage: "IAGE (insulin age)", bage: "BAGE (battery age)",
  pump: "Pump widget", loop: "Loop / OpenAPS widget",
};

export function SettingsForm({ shareUrl }: { shareUrl?: string | null }) {
  const [s, setS] = useState<NightscoutSettings>(loadSettings);
  const [saved, setSaved] = useState(false);
  const [testStatus, setTestStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const importRef = useRef<HTMLInputElement>(null);

  const EXPORT_VERSION = 2;

  function exportSettings() {
    const payload = {
      version:         EXPORT_VERSION,
      exportedAt:      new Date().toISOString(),
      settings:        s,
      dashboardConfig: loadDashboardConfig(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `nightscout-settings-v${EXPORT_VERSION}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importSettings(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const raw = JSON.parse(ev.target?.result as string) as
          | { version?: number; exportedAt?: string; settings: Partial<NightscoutSettings>; dashboardConfig?: Partial<DashboardConfig> }
          | Partial<NightscoutSettings>; // v1 compat: old exports were flat or had no version

        const fileVersion      = "version" in raw ? (raw.version ?? 1) : 0;
        const importedSettings = "settings" in raw ? raw.settings : raw;
        const importedDash     = "dashboardConfig" in raw ? raw.dashboardConfig : undefined;

        if (fileVersion > EXPORT_VERSION) {
          alert(`This file was exported from a newer version (v${fileVersion}). Some settings may not be supported.`);
        }

        setS({ ...DEFAULT_SETTINGS, ...importedSettings });
        if (importedDash) {
          saveDashboardConfig({ ...DASHBOARD_DEFAULTS, ...importedDash });
        }
        setSaved(false);
      } catch {
        alert("Invalid settings file — could not parse JSON.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  async function testNotification() {
    setTestStatus("sending");
    playAlarm("urgent-high");
    try {
      const res = await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Nightscout Test", message: "Notification test from Nightscout", priority: 0 }),
      });
      setTestStatus(res.ok ? "sent" : "error");
    } catch {
      setTestStatus("error");
    }
    setTimeout(() => setTestStatus("idle"), 4000);
  }

  // Merge server settings over localStorage on mount
  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.ok ? r.json() : null)
      .then((remote) => {
        if (remote) {
          const merged = { ...DEFAULT_SETTINGS, ...remote };
          setS(merged);
          saveSettings(merged); // keep localStorage in sync
        }
      })
      .catch(() => {/* server unavailable — keep localStorage version */});
  }, []);

  function patch(fields: Partial<NightscoutSettings>) {
    setS((prev) => ({ ...prev, ...fields }));
    setSaved(false);
  }

  async function save() {
    saveSettings(s);
    document.documentElement.classList.toggle("dark", s.nightMode);
    // Persist to server too (best-effort)
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(s),
    }).catch(() => {/* non-fatal */});
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="space-y-6">
      {/* Display */}
      <Card>
        <CardHeader><CardTitle className="text-base">Display</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Custom Title</Label>
            <Input
              placeholder="Nightscout"
              value={s.customTitle}
              onChange={(e) => patch({ customTitle: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">Replaces &quot;Nightscout&quot; in the sidebar header</p>
          </div>
          <div className="space-y-1.5">
            <Label>Glucose Units</Label>
            <Select value={s.unit} onValueChange={(v) => v && patch({ unit: v as "mg/dl" | "mmol" })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mg/dl">mg/dL</SelectItem>
                <SelectItem value="mmol">mmol/L</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Time Format</Label>
            <Select value={s.timeFormat} onValueChange={(v) => v && patch({ timeFormat: v as "12" | "24" })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="24">24-hour</SelectItem>
                <SelectItem value="12">12-hour (AM/PM)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <Label>Night Mode</Label>
            <Switch checked={s.nightMode} onCheckedChange={(v) => patch({ nightMode: v })} />
          </div>
        </CardContent>
      </Card>

      {/* Alarm thresholds */}
      <Card>
        <CardHeader><CardTitle className="text-base">Alarm Thresholds (mg/dL)</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {(["urgentLow", "low", "high", "urgentHigh"] as const).map((key) => (
            <div key={key} className="flex items-center gap-3">
              <Badge className={`w-28 justify-center text-white text-xs ${ALARM_COLORS[key]}`}>
                {ALARM_LABELS[key]}
              </Badge>
              <Input
                type="number" step="1" className="w-24"
                value={s[key]}
                onChange={(e) => patch({ [key]: parseInt(e.target.value) })}
              />
              <span className="text-sm text-muted-foreground">mg/dL</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Alarm snooze durations */}
      <Card>
        <CardHeader><CardTitle className="text-base">Alarm Snooze Times</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {ALARM_KEYS.map((key) => (
            <div key={key} className="flex items-center gap-3">
              <Badge className={`w-28 justify-center text-white text-xs ${ALARM_COLORS[key]}`}>
                {ALARM_LABELS[key]}
              </Badge>
              <Input
                type="number" step="5" min="5" max="120" className="w-20"
                value={s.snoozeMins[key]}
                onChange={(e) => patch({
                  snoozeMins: { ...s.snoozeMins, [key]: parseInt(e.target.value) || 15 },
                })}
              />
              <span className="text-sm text-muted-foreground">minutes</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Bolus display */}
      <Card>
        <CardHeader><CardTitle className="text-base">Chart Display</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Label className="w-56">Bolus display threshold</Label>
            <Input
              type="number" step="0.1" min="0" max="10" className="w-24"
              value={s.bolusDisplayThreshold}
              onChange={(e) => patch({ bolusDisplayThreshold: parseFloat(e.target.value) || 0 })}
            />
            <span className="text-sm text-muted-foreground">U (hide smaller)</span>
          </div>
        </CardContent>
      </Card>

      {/* Plugin visibility */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Show Plugins</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(Object.keys(PLUGIN_LABELS) as (keyof typeof PLUGIN_LABELS)[]).map((key) => (
            <div key={key} className="flex items-center justify-between">
              <Label className="font-normal">{PLUGIN_LABELS[key]}</Label>
              <Switch
                checked={s.plugins[key as keyof typeof s.plugins]}
                onCheckedChange={(v) => patch({ plugins: { ...s.plugins, [key]: v } })}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Insulin / carb settings */}
      <Card>
        <CardHeader><CardTitle className="text-base">Insulin &amp; Carbs</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Label className="w-48">Insulin Duration (DIA)</Label>
            <Input type="number" step="0.5" min="2" max="12" className="w-24"
              value={s.dia} onChange={(e) => patch({ dia: parseFloat(e.target.value) })} />
            <span className="text-sm text-muted-foreground">hours</span>
          </div>
          <div className="flex items-center gap-3">
            <Label className="w-48">Carb Absorption Rate</Label>
            <Input type="number" step="1" min="5" max="60" className="w-24"
              value={s.carbsPerHour} onChange={(e) => patch({ carbsPerHour: parseFloat(e.target.value) })} />
            <span className="text-sm text-muted-foreground">g/hr</span>
          </div>
        </CardContent>
      </Card>

      {/* Share / Follow link */}
      {shareUrl != null && (
        <Card>
          <CardHeader><CardTitle className="text-base">Follow / Share Link</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Share this read-only URL with caregivers or followers. Anyone with the link can view your BG — no login required.
            </p>
            <div className="flex gap-2">
              <input
                readOnly
                value={shareUrl}
                className="flex-1 text-xs font-mono bg-muted rounded-md px-3 py-2 border select-all"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <Button variant="outline" size="sm"
                onClick={() => navigator.clipboard?.writeText(shareUrl)}>
                Copy
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notifications test */}
      <Card>
        <CardHeader><CardTitle className="text-base">Notifications</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Configure <code className="text-xs bg-muted px-1 py-0.5 rounded">PUSHOVER_APP_TOKEN</code> +{" "}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">PUSHOVER_USER_KEY</code> or{" "}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">TELEGRAM_BOT_TOKEN</code> +{" "}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">TELEGRAM_CHAT_ID</code> in your environment.
          </p>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={testNotification} disabled={testStatus === "sending"}>
              {testStatus === "sending" ? "Sending…" : "Test Alarm + Push"}
            </Button>
            {testStatus === "sent"  && <Badge className="bg-green-600 text-white">Sent ✓</Badge>}
            {testStatus === "error" && <Badge variant="destructive">Not configured</Badge>}
          </div>
        </CardContent>
      </Card>

      {/* Speak alarms */}
      <Card>
        <CardHeader><CardTitle className="text-base">Alarm Voice</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label>Speak alarms (TTS)</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Read alarm text aloud using device speech synthesis</p>
            </div>
            <Switch checked={s.speakAlarms ?? false} onCheckedChange={(v) => patch({ speakAlarms: v })} />
          </div>
        </CardContent>
      </Card>

      {/* Export / Import */}
      <Card>
        <CardHeader><CardTitle className="text-base">Backup &amp; Restore</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Export your settings as JSON or restore from a previous backup.</p>
          <div className="flex gap-3 flex-wrap">
            <Button variant="outline" onClick={exportSettings}>Export Settings</Button>
            <Button variant="outline" onClick={() => importRef.current?.click()}>Import Settings</Button>
            <input ref={importRef} type="file" accept=".json,application/json" className="hidden" onChange={importSettings} />
          </div>
          <p className="text-xs text-muted-foreground">After importing, click Save Settings to apply.</p>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={save}>Save Settings</Button>
        {saved && <Badge className="bg-green-600 text-white">Saved ✓</Badge>}
      </div>
    </div>
  );
}
