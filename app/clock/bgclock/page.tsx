"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { formatGlucose } from "@/lib/nightscout/units";
import { calcDelta } from "@/lib/nightscout/delta";
import { DIRECTION_ARROWS } from "@/lib/nightscout/alarms";
import { loadSettings } from "@/lib/nightscout/settings";
import { ClockContextMenu } from "@/components/clock/ClockContextMenu";
import type { Entry } from "@/types/nightscout";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const STALE_MS = 15 * 60_000;

function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export default function BgClockPage() {
  const settings = loadSettings();
  const unit = settings.unit;
  const now = useNow();

  const { data: entries = [] } = useSWR<Entry[]>(
    "/api/v3/entries?count=3",
    fetcher,
    { refreshInterval: 60_000 }
  );

  const sorted = [...entries].filter((e) => e.sgv).sort((a, b) => b.date - a.date);
  const latest = sorted[0];
  const delta  = calcDelta(sorted);
  const stale  = !latest || now - latest.date > STALE_MS;

  const bg    = latest?.sgv ? formatGlucose(latest.sgv, unit) : "---";
  const arrow = DIRECTION_ARROWS[latest?.direction ?? "NONE"] ?? "";
  const dStr  = delta?.display ?? "";
  const time  = new Date().toLocaleTimeString([], {
    hour: "2-digit", minute: "2-digit",
    hour12: settings.timeFormat === "12",
  });

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center select-none">
      <ClockContextMenu />
      {/* BG number */}
      <div className={`text-[22vw] font-bold tabular-nums leading-none ${stale ? "opacity-30" : ""}`}>
        {bg}
      </div>

      {/* Arrow */}
      <div className="text-[12vw] leading-none mt-2">{arrow}</div>

      {/* Delta */}
      {dStr && (
        <div className="text-[6vw] text-gray-300 tabular-nums mt-2">{dStr}</div>
      )}

      {/* Unit */}
      <div className="text-[3vw] text-gray-500 mt-1">
        {unit === "mmol" ? "mmol/L" : "mg/dL"}
      </div>

      {/* Clock */}
      <div className="text-[5vw] text-gray-400 mt-6">{time}</div>

      {stale && (
        <div className="text-[3vw] text-red-500 mt-4 animate-pulse">STALE</div>
      )}
    </div>
  );
}
