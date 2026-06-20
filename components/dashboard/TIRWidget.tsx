"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { loadDashboardConfig, DASHBOARD_DEFAULTS } from "@/lib/nightscout/dashboardConfig";
import { calcTIR, type TIRThresholds } from "@/lib/nightscout/tir";
import type { Entry } from "@/types/nightscout";

interface Zone {
  label:  string;
  short:  string;
  key:    keyof ReturnType<typeof calcTIR>;
  color:  string;
}

const ZONES: Zone[] = [
  { label: "Very High", short: "VHi", key: "veryHigh", color: "#dc2626" },
  { label: "High",      short: "Hi",  key: "high",     color: "#f59e0b" },
  { label: "In Range",  short: "TIR", key: "inRange",  color: "#22c55e" },
  { label: "Low",       short: "Lo",  key: "low",      color: "#f97316" },
  { label: "Very Low",  short: "VLo", key: "veryLow",  color: "#7f1d1d" },
];

export function TIRWidget({
  entries,
  thresholds,
}: {
  entries: Entry[];
  thresholds: TIRThresholds;
}) {
  const tir = calcTIR(entries, thresholds);

  // Container-width measurement
  const wrapRef = useRef<HTMLDivElement>(null);
  const [cw, setCw] = useState(999);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([e]) => setCw(e.contentRect.width));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Load layout preference from config
  const [tirLayout, setTirLayout] = useState(DASHBOARD_DEFAULTS.tirLayout);
  useEffect(() => {
    const load = () => setTirLayout(loadDashboardConfig().tirLayout);
    load();
    window.addEventListener("ns-dashboard-config", load);
    return () => window.removeEventListener("ns-dashboard-config", load);
  }, []);

  const forceCompact = tirLayout === "compact";
  // Auto-compact when container is very narrow
  const isCompact  = forceCompact || cw < 200;
  // Use 2-col legend when container can't fit 5
  const useTwoCol  = !isCompact && cw < 300;

  if (!tir.count) return null;

  // ── Stacked bar (shared) ─────────────────────────────────────────────────────
  const stackedBar = (
    <div className="flex rounded-md overflow-hidden w-full" style={{ height: isCompact ? "28px" : "24px" }}>
      {ZONES.map(({ key, color, label }) => {
        const pct = tir[key] as number;
        if (!pct) return null;
        return (
          <div
            key={key}
            style={{ width: `${pct}%`, background: color }}
            title={`${label}: ${pct}%`}
            className="flex items-center justify-center transition-all"
          >
            {pct >= (isCompact ? 10 : 8) && (
              <span style={{ color: "white", fontSize: 10, fontWeight: 700, textShadow: "0 1px 2px rgba(0,0,0,.4)" }}>
                {pct}%
              </span>
            )}
          </div>
        );
      })}
    </div>
  );

  // ── Compact layout ────────────────────────────────────────────────────────────
  if (isCompact) {
    return (
      <div ref={wrapRef} className="h-full">
      <Card className="h-full overflow-hidden">
        <CardContent className="p-3 h-full flex flex-col justify-center gap-2 overflow-y-auto scrollbar-none">
          {stackedBar}
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              TIR <span className="font-bold text-foreground">{tir.inRange}%</span>
            </span>
            <span className="text-muted-foreground tabular-nums">{tir.count} rdgs</span>
          </div>
        </CardContent>
      </Card>
      </div>
    );
  }

  // ── Full layout ───────────────────────────────────────────────────────────────
  return (
    <div ref={wrapRef} className="h-full">
    <Card className="h-full overflow-hidden">
      <CardContent className="p-3 h-full flex flex-col gap-2 overflow-y-auto scrollbar-none">
        <div className="flex items-center justify-between shrink-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Time in Range
          </p>
          <span className="text-[10px] text-muted-foreground">{tir.count} readings</span>
        </div>

        {stackedBar}

        {/* Legend */}
        {useTwoCol ? (
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            {ZONES.map(({ key, color, label, short }) => (
              <div key={key} className="flex items-center gap-1.5 text-xs">
                <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: color }} />
                <span className="text-muted-foreground truncate">{cw < 240 ? short : label}</span>
                <span className="font-semibold tabular-nums ml-auto">{tir[key] as number}%</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-1">
            {ZONES.map(({ key, color, label, short }) => (
              <div key={key} className="flex flex-col items-center gap-0.5 text-xs">
                <div className="w-3 h-3 rounded-sm" style={{ background: color }} />
                <span className="text-muted-foreground text-center leading-tight">
                  {cw < 360 ? short : label}
                </span>
                <span className="font-semibold tabular-nums">{tir[key] as number}%</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
    </div>
  );
}
