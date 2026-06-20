"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { formatGlucose } from "@/lib/nightscout/units";
import { calcDelta } from "@/lib/nightscout/delta";
import { getAlarmLevel, DIRECTION_ARROWS } from "@/lib/nightscout/alarms";
import { loadSettings } from "@/lib/nightscout/settings";
import { ClockContextMenu } from "@/components/clock/ClockContextMenu";
import type { Entry } from "@/types/nightscout";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const STALE_MS = 15 * 60_000;

const LEVEL_BG: Record<string, string> = {
  "urgent-low":  "#7f1d1d",
  low:           "#92400e",
  normal:        "#14532d",
  high:          "#713f12",
  "urgent-high": "#7c2d12",
  stale:         "#1c1917",
};

function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export default function ClockColorPage() {
  const settings = loadSettings();
  const unit     = settings.unit;
  const now      = useNow();

  const { data: entries = [] } = useSWR<Entry[]>(
    "/api/v3/entries?count=3",
    fetcher,
    { refreshInterval: 60_000 }
  );

  const sorted = [...entries].filter((e) => e.sgv).sort((a, b) => b.date - a.date);
  const latest = sorted[0];
  const delta  = calcDelta(sorted);
  const stale  = !latest || now - latest.date > STALE_MS;

  const thresholds = {
    urgentLow:  settings.urgentLow,
    low:        settings.low,
    high:       settings.high,
    urgentHigh: settings.urgentHigh,
  };

  const level  = stale ? "stale" : (latest ? getAlarmLevel(latest, thresholds) : "normal");
  const bg     = latest?.sgv ? formatGlucose(latest.sgv, unit) : "---";
  const arrow  = DIRECTION_ARROWS[latest?.direction ?? "NONE"] ?? "";
  const dStr   = delta?.display ?? "";
  const time   = new Date().toLocaleTimeString([], {
    hour: "2-digit", minute: "2-digit",
    hour12: settings.timeFormat === "12",
  });
  const bgColor = LEVEL_BG[level] ?? LEVEL_BG.normal;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center select-none transition-colors duration-1000"
      style={{ backgroundColor: bgColor }}
    >
      <ClockContextMenu />
      <div className="text-[20vw] font-bold tabular-nums leading-none text-white drop-shadow-lg">
        {bg}
      </div>
      <div className="text-[10vw] leading-none mt-1 text-white/90">{arrow}</div>
      {dStr && (
        <div className="text-[5vw] tabular-nums text-white/70 mt-1">{dStr}</div>
      )}
      <div className="text-[2.5vw] text-white/40 mt-1">
        {unit === "mmol" ? "mmol/L" : "mg/dL"}
      </div>
      <div className="text-[4vw] text-white/60 mt-6">{time}</div>
      {stale && (
        <div className="text-[2.5vw] text-red-300 mt-4 animate-pulse">STALE DATA</div>
      )}
    </div>
  );
}
