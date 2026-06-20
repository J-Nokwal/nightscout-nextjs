"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { ClockContextMenu } from "@/components/clock/ClockContextMenu";
import { formatGlucose } from "@/lib/nightscout/units";
import { calcDelta } from "@/lib/nightscout/delta";
import { getAlarmLevel, DIRECTION_ARROWS } from "@/lib/nightscout/alarms";
import { timeAgo } from "@/lib/nightscout/timeago";
import { loadSettings } from "@/lib/nightscout/settings";
import {
  loadClockConfig, resolveBackground, resolveTextColor, FONT_FAMILY_CLASS,
} from "@/lib/nightscout/customClock";
import type { Entry } from "@/types/nightscout";

const fetcher = (url: string) => fetch(url).then((r) => r.json());
const STALE_MS = 15 * 60_000;

function useNow(ms = 1_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(id); }, [ms]);
  return now;
}

export default function CustomClockPage() {
  const [config, setConfig] = useState(() => loadClockConfig());
  const settings = loadSettings();
  const now = useNow(config.showClock ? 1_000 : 30_000);

  // Reload config if user navigates back from builder
  useEffect(() => {
    const handler = () => setConfig(loadClockConfig());
    window.addEventListener("focus", handler);
    return () => window.removeEventListener("focus", handler);
  }, []);

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
  const level = stale ? "stale" : (latest ? getAlarmLevel(latest, thresholds) : "normal");

  const bgDisplay  = latest?.sgv ? formatGlucose(latest.sgv, settings.unit) : "---";
  const arrow      = DIRECTION_ARROWS[latest?.direction ?? "NONE"] ?? "";
  const dStr       = delta?.display ?? "";
  const agoStr     = latest ? timeAgo(latest.date, now) : "---";
  const unitLabel  = settings.unit === "mmol" ? "mmol/L" : "mg/dL";
  const clockStr   = new Date(now).toLocaleTimeString([], {
    hour: "2-digit", minute: "2-digit",
    second: config.showClock ? "2-digit" : undefined,
    hour12: settings.timeFormat === "12",
  });
  const dateStr    = new Date(now).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });

  const bg   = resolveBackground(config, level);
  const text = resolveTextColor(config, level);
  const fontClass = FONT_FAMILY_CLASS[config.fontFamily];

  // Shared dim color for secondary elements
  const dimStyle = { color: `${text}99` };

  const bgEl = config.showBG && (
    <div style={{ fontSize: `${config.bgFontSize}vw`, color: text, lineHeight: 1 }}
      className={`font-bold tabular-nums ${stale ? "opacity-30" : ""}`}>
      {bgDisplay}
    </div>
  );

  const arrowEl = config.showArrow && (
    <div style={{ fontSize: `${config.arrowFontSize}vw`, color: text, lineHeight: 1 }}>
      {arrow}
    </div>
  );

  const deltaEl = config.showDelta && dStr && (
    <div style={{ fontSize: `${config.deltaFontSize}vw`, ...dimStyle }} className="tabular-nums">
      {dStr}
    </div>
  );

  const clockEl = config.showClock && (
    <div style={{ fontSize: `${config.clockFontSize}vw`, ...dimStyle }} className="tabular-nums font-mono">
      {clockStr}
    </div>
  );

  const dateEl = config.showDate && (
    <div style={{ fontSize: `${Math.max(2, config.clockFontSize * 0.4)}vw`, color: `${text}55` }}>
      {dateStr}
    </div>
  );

  const metaEl = (config.showUnit || config.showAgo) && (
    <div style={{ fontSize: "2.2vw", color: `${text}44` }}>
      {[config.showUnit && unitLabel, config.showAgo && agoStr].filter(Boolean).join(" · ")}
    </div>
  );

  const staleEl = config.showStale && stale && (
    <div style={{ fontSize: "2.5vw" }} className="text-red-400 animate-pulse">
      STALE DATA
    </div>
  );

  const renderCenter = () => (
    <div className="flex flex-col items-center gap-3">
      {config.layout === "clock-top" && <>{clockEl}{dateEl}</>}
      {bgEl}
      {arrowEl}
      {deltaEl}
      {config.layout === "center" && <>{clockEl}{dateEl}</>}
      {metaEl}
      {staleEl}
      {config.layout === "bg-top" && <>{clockEl}{dateEl}</>}
    </div>
  );

  return (
    <div
      className={`min-h-screen flex flex-col items-center justify-center select-none transition-colors duration-700 ${fontClass}`}
      style={{ backgroundColor: bg }}
    >
      <ClockContextMenu isCustom />
      {renderCenter()}
    </div>
  );
}
