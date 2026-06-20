"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Settings2, Eye, RotateCcw, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatGlucose } from "@/lib/nightscout/units";
import { calcDelta } from "@/lib/nightscout/delta";
import { getAlarmLevel, DIRECTION_ARROWS } from "@/lib/nightscout/alarms";
import { timeAgo } from "@/lib/nightscout/timeago";
import { loadSettings } from "@/lib/nightscout/settings";
import {
  loadClockConfig, saveClockConfig, resolveBackground, resolveTextColor,
  FONT_FAMILY_CLASS, DEFAULT_CUSTOM_CLOCK,
  type CustomClockConfig, type BgMode, type TextMode, type FontFamily, type ClockLayout,
} from "@/lib/nightscout/customClock";
import type { Entry } from "@/types/nightscout";

const fetcher = (url: string) => fetch(url).then((r) => r.json());
const STALE_MS = 15 * 60_000;

function useNow(ms = 1_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(id); }, [ms]);
  return now;
}

// ── Mini live preview ──────────────────────────────────────────────────────────
function ClockPreview({ config, level, bgDisplay, arrow, dStr, agoStr, unitLabel, clockStr, dateStr }: {
  config: CustomClockConfig;
  level: string;
  bgDisplay: string;
  arrow: string;
  dStr: string;
  agoStr: string;
  unitLabel: string;
  clockStr: string;
  dateStr: string;
}) {
  const bg   = resolveBackground(config, level);
  const text = resolveTextColor(config, level);
  const dim  = `${text}88`;
  const faint= `${text}44`;
  const fontClass = FONT_FAMILY_CLASS[config.fontFamily];

  // Scale everything down to fit inside the preview box (320×200px = ~0.33 of full screen)
  const scale = 0.38;
  const fs = (vw: number) => `${vw * scale}vw`;

  return (
    <div
      className={`relative w-full rounded-xl overflow-hidden flex flex-col items-center justify-center gap-2 transition-colors duration-500 ${fontClass}`}
      style={{ backgroundColor: bg, minHeight: 220 }}
    >
      {config.layout === "clock-top" && config.showClock && (
        <div style={{ fontSize: fs(config.clockFontSize), color: dim }} className="tabular-nums font-mono">{clockStr}</div>
      )}
      {config.layout === "clock-top" && config.showDate && (
        <div style={{ fontSize: fs(config.clockFontSize * 0.4), color: faint }}>{dateStr}</div>
      )}

      {config.showBG && (
        <div style={{ fontSize: fs(config.bgFontSize), color: text, lineHeight: 1 }}
          className="font-bold tabular-nums select-none">
          {bgDisplay}
        </div>
      )}
      {config.showArrow && (
        <div style={{ fontSize: fs(config.arrowFontSize), color: text, lineHeight: 1 }}>{arrow}</div>
      )}
      {config.showDelta && dStr && (
        <div style={{ fontSize: fs(config.deltaFontSize), color: dim }} className="tabular-nums">{dStr}</div>
      )}

      {config.layout === "center" && config.showClock && (
        <div style={{ fontSize: fs(config.clockFontSize), color: dim }} className="tabular-nums font-mono">{clockStr}</div>
      )}
      {config.layout === "center" && config.showDate && (
        <div style={{ fontSize: fs(config.clockFontSize * 0.4), color: faint }}>{dateStr}</div>
      )}

      {(config.showUnit || config.showAgo) && (
        <div style={{ fontSize: "1.8vw", color: faint }}>
          {[config.showUnit && unitLabel, config.showAgo && agoStr].filter(Boolean).join(" · ")}
        </div>
      )}

      {config.layout === "bg-top" && config.showClock && (
        <div style={{ fontSize: fs(config.clockFontSize), color: dim }} className="tabular-nums font-mono">{clockStr}</div>
      )}
      {config.layout === "bg-top" && config.showDate && (
        <div style={{ fontSize: fs(config.clockFontSize * 0.4), color: faint }}>{dateStr}</div>
      )}

      <div className="absolute top-2 right-2">
        <Badge className="text-xs opacity-50" style={{ background: bg, color: dim, border: `1px solid ${dim}` }}>
          Preview
        </Badge>
      </div>
    </div>
  );
}

// ── Option button row ──────────────────────────────────────────────────────────
function OptionRow<T extends string>({
  label, value, options, onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex flex-wrap gap-1">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
              value === opt.value
                ? "bg-primary text-primary-foreground border-primary font-medium"
                : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Slider ─────────────────────────────────────────────────────────────────────
function SliderRow({ label, value, min, max, step = 1, unit = "vw", onChange }: {
  label: string; value: number; min: number; max: number; step?: number; unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <span className="text-xs tabular-nums text-muted-foreground">{value}{unit}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary h-1.5 rounded-full"
      />
    </div>
  );
}

// ── Toggle row ─────────────────────────────────────────────────────────────────
function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-1">
      <Label className="text-sm cursor-pointer">{label}</Label>
      <Switch checked={value} onCheckedChange={onChange} />
    </div>
  );
}

// ── Main builder ───────────────────────────────────────────────────────────────
export default function ClockBuilderPage() {
  const [config, setConfig] = useState<CustomClockConfig>(() => loadClockConfig());
  const [saved, setSaved]   = useState(false);
  const router = useRouter();
  const settings = loadSettings();
  const now = useNow(config.showClock ? 1_000 : 10_000);

  const { data: entries = [] } = useSWR<Entry[]>(
    "/api/v3/entries?count=3", fetcher, { refreshInterval: 60_000 }
  );

  const sorted = [...entries].filter((e) => e.sgv).sort((a, b) => b.date - a.date);
  const latest = sorted[0];
  const delta  = calcDelta(sorted);
  const stale  = !latest || now - latest.date > STALE_MS;
  const thresholds = {
    urgentLow: settings.urgentLow, low: settings.low,
    high: settings.high, urgentHigh: settings.urgentHigh,
  };
  const level     = stale ? "stale" : (latest ? getAlarmLevel(latest, thresholds) : "normal");
  const bgDisplay = latest?.sgv ? formatGlucose(latest.sgv, settings.unit) : "120";
  const arrow     = DIRECTION_ARROWS[latest?.direction ?? "NONE"] ?? "→";
  const dStr      = delta?.display ?? "+2";
  const agoStr    = latest ? timeAgo(latest.date, now) : "2m ago";
  const unitLabel = settings.unit === "mmol" ? "mmol/L" : "mg/dL";
  const clockStr  = new Date(now).toLocaleTimeString([], {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: settings.timeFormat === "12",
  });
  const dateStr = new Date(now).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });

  function patch(fields: Partial<CustomClockConfig>) {
    setConfig((prev) => ({ ...prev, ...fields }));
    setSaved(false);
  }

  function save() {
    saveClockConfig(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function preview() {
    saveClockConfig(config);
    router.push("/clock/custom");
  }

  function reset() {
    setConfig(DEFAULT_CUSTOM_CLOCK);
    setSaved(false);
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b px-4 py-3 flex items-center justify-between gap-3 sticky top-0 bg-background/95 backdrop-blur z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" render={<Link href="/clock" />}>
            <ArrowLeft size={16} />
          </Button>
          <div className="flex items-center gap-2">
            <Settings2 size={18} className="text-primary" />
            <span className="font-semibold">Custom Clock Builder</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={reset} title="Reset to defaults">
            <RotateCcw size={15} />
          </Button>
          <Button variant="outline" size="sm" onClick={save}>
            {saved ? "Saved ✓" : "Save"}
          </Button>
          <Button size="sm" onClick={preview} className="gap-1.5">
            <Eye size={14} /> Open Clock
          </Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row flex-1 overflow-auto">
        {/* ── Controls panel ── */}
        <div className="lg:w-80 xl:w-96 shrink-0 border-r overflow-y-auto p-4 space-y-5">

          {/* Background */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Background</p>
            <OptionRow<BgMode>
              label="Mode"
              value={config.bgMode}
              options={[
                { value: "black", label: "Black" },
                { value: "dark",  label: "Dark" },
                { value: "solid", label: "Solid" },
                { value: "alarm", label: "Alarm" },
              ]}
              onChange={(v) => patch({ bgMode: v })}
            />
            {config.bgMode === "solid" && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Background color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color" value={config.bgColor}
                    onChange={(e) => patch({ bgColor: e.target.value })}
                    className="w-10 h-8 rounded cursor-pointer border"
                  />
                  <span className="text-xs font-mono text-muted-foreground">{config.bgColor}</span>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Text / BG number */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">BG Number</p>
            <ToggleRow label="Show BG" value={config.showBG} onChange={(v) => patch({ showBG: v })} />
            <OptionRow<TextMode>
              label="Color mode"
              value={config.textMode}
              options={[
                { value: "alarm", label: "Alarm" },
                { value: "white", label: "White" },
                { value: "green", label: "Green" },
                { value: "solid", label: "Custom" },
              ]}
              onChange={(v) => patch({ textMode: v })}
            />
            {config.textMode === "solid" && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Text color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color" value={config.textColor}
                    onChange={(e) => patch({ textColor: e.target.value })}
                    className="w-10 h-8 rounded cursor-pointer border"
                  />
                  <span className="text-xs font-mono text-muted-foreground">{config.textColor}</span>
                </div>
              </div>
            )}
            <SliderRow label="Font size" value={config.bgFontSize} min={8} max={35} onChange={(v) => patch({ bgFontSize: v })} />
          </div>

          <Separator />

          {/* Arrow + Delta */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Arrow & Delta</p>
            <ToggleRow label="Show arrow"  value={config.showArrow} onChange={(v) => patch({ showArrow: v })} />
            <ToggleRow label="Show delta"  value={config.showDelta} onChange={(v) => patch({ showDelta: v })} />
            <SliderRow label="Arrow size"  value={config.arrowFontSize}  min={4} max={20} onChange={(v) => patch({ arrowFontSize: v })} />
            <SliderRow label="Delta size"  value={config.deltaFontSize}  min={2} max={12} onChange={(v) => patch({ deltaFontSize: v })} />
          </div>

          <Separator />

          {/* Clock */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Clock</p>
            <ToggleRow label="Show clock" value={config.showClock} onChange={(v) => patch({ showClock: v })} />
            <ToggleRow label="Show date"  value={config.showDate}  onChange={(v) => patch({ showDate: v })} />
            <SliderRow label="Clock size" value={config.clockFontSize} min={2} max={15} onChange={(v) => patch({ clockFontSize: v })} />
          </div>

          <Separator />

          {/* Meta */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Meta</p>
            <ToggleRow label="Show unit (mg/dL)"   value={config.showUnit}  onChange={(v) => patch({ showUnit: v })} />
            <ToggleRow label="Show time ago"        value={config.showAgo}   onChange={(v) => patch({ showAgo: v })} />
            <ToggleRow label="Show stale warning"   value={config.showStale} onChange={(v) => patch({ showStale: v })} />
          </div>

          <Separator />

          {/* Font + Layout */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Typography & Layout</p>
            <OptionRow<FontFamily>
              label="Font family"
              value={config.fontFamily}
              options={[
                { value: "sans",  label: "Sans" },
                { value: "mono",  label: "Mono" },
                { value: "serif", label: "Serif" },
              ]}
              onChange={(v) => patch({ fontFamily: v })}
            />
            <OptionRow<ClockLayout>
              label="Layout"
              value={config.layout}
              options={[
                { value: "center",    label: "BG center" },
                { value: "clock-top", label: "Clock top" },
                { value: "bg-top",    label: "Clock bottom" },
              ]}
              onChange={(v) => patch({ layout: v })}
            />
          </div>

          <Separator />

          {/* Preset buttons */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Quick Presets</p>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: "Dark minimal", cfg: { bgMode: "black" as BgMode, textMode: "alarm" as TextMode, showDate: false, showUnit: false, showAgo: false, fontFamily: "sans" as FontFamily } },
                { label: "Color reactive", cfg: { bgMode: "alarm" as BgMode, textMode: "white" as TextMode, showDate: true, showUnit: true } },
                { label: "Monochrome", cfg: { bgMode: "solid" as BgMode, bgColor: "#0f172a", textMode: "solid" as TextMode, textColor: "#f1f5f9", fontFamily: "mono" as FontFamily } },
                { label: "Green terminal", cfg: { bgMode: "black" as BgMode, textMode: "green" as TextMode, fontFamily: "mono" as FontFamily, showDate: true } },
              ].map(({ label, cfg }) => (
                <button
                  key={label}
                  onClick={() => patch(cfg)}
                  className="text-xs px-2.5 py-1 rounded border border-border text-muted-foreground hover:border-foreground hover:text-foreground transition-colors"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Live preview panel ── */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-4 bg-muted/30">
          <p className="text-xs text-muted-foreground">Live preview — uses real BG data</p>
          <div className="w-full max-w-2xl">
            <ClockPreview
              config={config} level={level}
              bgDisplay={bgDisplay} arrow={arrow} dStr={dStr}
              agoStr={agoStr} unitLabel={unitLabel}
              clockStr={clockStr} dateStr={dateStr}
            />
          </div>
          <div className="flex gap-2 mt-2">
            <Button onClick={save} variant="outline" size="sm">
              {saved ? "Saved ✓" : "Save settings"}
            </Button>
            <Button onClick={preview} size="sm" className="gap-1.5">
              <Eye size={14} /> Open full-screen
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center max-w-xs">
            Settings are saved to this browser. The custom clock at{" "}
            <code className="bg-muted px-1 rounded">/clock/custom</code> reads them automatically.
          </p>
        </div>
      </div>
    </div>
  );
}
