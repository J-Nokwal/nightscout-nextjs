"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { formatGlucose } from "@/lib/nightscout/units";
import { calcDelta } from "@/lib/nightscout/delta";
import { getAlarmLevel, DIRECTION_ARROWS } from "@/lib/nightscout/alarms";
import { timeAgo } from "@/lib/nightscout/timeago";
import { loadSettings } from "@/lib/nightscout/settings";
import { ClockContextMenu } from "@/components/clock/ClockContextMenu";
import type { Entry } from "@/types/nightscout";

const fetcher = (url: string) => fetch(url).then((r) => r.json());
const STALE_MS = 15 * 60_000;

function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

const LEVEL_TEXT: Record<string, string> = {
  "urgent-low":  "text-red-400",
  low:           "text-orange-400",
  normal:        "text-green-400",
  high:          "text-yellow-400",
  "urgent-high": "text-red-400",
  stale:         "text-gray-500",
};

export default function ClockPage() {
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

  const level    = stale ? "stale" : (latest ? getAlarmLevel(latest, thresholds) : "normal");
  const bg       = latest?.sgv ? formatGlucose(latest.sgv, unit) : "---";
  const arrow    = DIRECTION_ARROWS[latest?.direction ?? "NONE"] ?? "";
  const dStr     = delta?.display ?? "";
  const ago      = latest ? timeAgo(latest.date, now) : "---";
  const textColor = LEVEL_TEXT[level] ?? LEVEL_TEXT.normal;

  const clockStr = new Date(now).toLocaleTimeString([], {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: settings.timeFormat === "12",
  });
  const dateStr = new Date(now).toLocaleDateString([], {
    weekday: "short", month: "short", day: "numeric",
  });

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-6 select-none">
      <ClockContextMenu />
      {/* Clock */}
      <div className="text-[10vw] text-gray-300 font-mono tabular-nums">{clockStr}</div>
      <div className="text-[3vw] text-gray-500">{dateStr}</div>

      {/* BG */}
      <div className={`text-[18vw] font-bold tabular-nums leading-none ${textColor}`}>
        {bg}
      </div>

      {/* Arrow + delta */}
      <div className="flex items-center gap-4">
        <span className={`text-[8vw] ${textColor}`}>{arrow}</span>
        {dStr && (
          <span className="text-[4vw] text-gray-400 tabular-nums">{dStr}</span>
        )}
      </div>

      {/* Unit + age */}
      <div className="text-[2.5vw] text-gray-600">
        {unit === "mmol" ? "mmol/L" : "mg/dL"} · {ago}
      </div>

      {stale && (
        <div className="text-[2.5vw] text-red-500 animate-pulse">STALE DATA</div>
      )}
    </div>
  );
}
