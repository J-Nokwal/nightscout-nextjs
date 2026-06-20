"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { GlucoseChart } from "@/components/charts/GlucoseChart";
import { buildBasalTimeline } from "@/lib/nightscout/basal";
import { useCGMData } from "@/lib/nightscout/useCGMData";
import type { Entry, Treatment, ProfileStore } from "@/types/nightscout";
import type { GlucoseUnit } from "@/lib/nightscout/units";

interface Props {
  initialEntries: Entry[];
  initialTreatments?: Treatment[];
  basalSchedule?: ProfileStore["basal"];
  unit?: GlucoseUnit;
  iob?: number;
}

const FOCUS_HOURS_OPTIONS = [0.25, 0.5, 1, 2, 3, 4, 6, 12, 24];

function formatFocusLabel(h: number): string {
  if (h < 1) return `${Math.round(h * 60)}m`;
  return `${h}h`;
}

export function ChartWidget({
  initialEntries,
  initialTreatments = [],
  basalSchedule,
  unit: propUnit,
  iob = 0,
}: Props) {
  const [focusHours, setFocusHours] = useState(3);
  const [hovered, setHovered]     = useState<{ mills: number; sgv: number } | null>(null);
  const [autoScale, setAutoScale] = useState(false);
  const [compact, setCompact]     = useState(false);

  // Detect narrow container so we can pass compact hints to the chart
  const wrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([e]) => setCompact(e.contentRect.width < 480));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const {
    entries, treatments, statuses, sorted,
    forecast, loopPredicted, thresholds,
    settings, unit, cob, now,
  } = useCGMData(initialEntries, initialTreatments, propUnit);

  const chartFrom = now - focusHours * 3600_000;
  const basalTimeline = basalSchedule?.length
    ? buildBasalTimeline(
        { basal: basalSchedule } as import("@/types/nightscout").ProfileStore,
        treatments,
        chartFrom,
        now,
      )
    : [];

  const hoveredLabel = hovered
    ? `${unit === "mmol" ? (hovered.sgv / 18.01559).toFixed(1) : Math.round(hovered.sgv)} ${
        unit === "mmol" ? "mmol/L" : "mg/dL"
      } · ${new Date(hovered.mills).toLocaleTimeString([], {
        hour: "2-digit", minute: "2-digit",
        hour12: settings.timeFormat === "12",
      })}`
    : null;

  return (
    <div ref={wrapRef} className="flex flex-col h-full">
    <Card className="flex flex-col flex-1 min-h-0">
      <CardContent className="pt-2 px-2 pb-2 flex flex-col flex-1 min-h-0 gap-1">

        {/* Row 1: legend / hover readout + Auto toggle */}
        <div className="flex items-center justify-between px-1 shrink-0 min-w-0">
          <p className="text-xs text-muted-foreground truncate mr-2 min-w-0">
            {hoveredLabel
              ? <span className="font-semibold text-foreground tabular-nums">{hoveredLabel}</span>
              : <span className="hidden sm:inline">{formatFocusLabel(focusHours)} trend · dashed = AR2</span>
            }
          </p>
          <button
            onClick={() => setAutoScale((v) => !v)}
            title={autoScale ? "Switch to full range (35–300)" : "Fit Y-axis to visible data"}
            className={`text-xs px-2 py-0.5 rounded border shrink-0 transition-colors ${
              autoScale
                ? "bg-primary text-primary-foreground border-primary font-semibold"
                : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/40"
            }`}
          >
            {autoScale ? "Auto ↕" : "Full ↕"}
          </button>
        </div>

        {/* Row 2: time-window buttons — horizontally scrollable, no wrapping */}
        <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-none px-1 shrink-0 pb-0.5">
          {FOCUS_HOURS_OPTIONS.map((h) => (
            <button
              key={h}
              onClick={() => setFocusHours(h)}
              className={`text-xs px-2 py-0.5 rounded shrink-0 transition-colors ${
                h === focusHours
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {formatFocusLabel(h)}
            </button>
          ))}
        </div>

        {/* Chart — fills remaining height */}
        <div className="flex-1 min-h-[160px] min-w-0">
          <GlucoseChart
            entries={entries}
            predicted={forecast?.predicted ?? []}
            cone={forecast?.cone ?? []}
            treatments={treatments}
            loopPredicted={loopPredicted}
            basalTimeline={basalTimeline}
            targetLow={thresholds.low}
            targetHigh={thresholds.high}
            urgentLow={thresholds.urgentLow}
            urgentHigh={thresholds.urgentHigh}
            unit={unit}
            focusHours={focusHours}
            bolusDisplayThreshold={settings.bolusDisplayThreshold ?? 0}
            timeFormat={settings.timeFormat ?? "24"}
            onHover={setHovered}
            autoScale={autoScale}
            compact={compact}
          />
        </div>

        {/* Pills row */}
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 px-1 pt-1.5 border-t border-border/50 shrink-0">
          {settings.plugins?.iob !== false && iob > 0 && (
            <span className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{iob.toFixed(2)}U</span> IOB
            </span>
          )}
          {settings.plugins?.cob !== false && cob.cob > 0 && (
            <span className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{Math.round(cob.cob)}g</span> COB
            </span>
          )}
          {settings.plugins?.noise !== false && sorted[0]?.noise != null && (() => {
            const noise = sorted[0].noise!;
            const labels: Record<number, string> = { 0: "None", 1: "Clean", 2: "Light", 3: "Medium", 4: "Heavy" };
            const colors: Record<number, string> = { 0: "#9ca3af", 1: "#22c55e", 2: "#eab308", 3: "#f97316", 4: "#ef4444" };
            return (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: colors[noise] ?? "#9ca3af" }} />
                {labels[noise] ?? `Noise ${noise}`}
              </span>
            );
          })()}
          {settings.plugins?.upbat !== false && statuses[0]?.uploader?.battery != null && (
            <span className="text-xs text-muted-foreground">
              Uploader: <span className={`font-medium ${statuses[0].uploader.battery < 20 ? "text-red-500" : "text-foreground"}`}>
                {statuses[0].uploader.battery}%
              </span>
            </span>
          )}
          {settings.plugins?.pump !== false && statuses[0]?.pump?.reservoir != null && (
            <span className="text-xs text-muted-foreground">
              Res: <span className={`font-medium ${(statuses[0].pump!.reservoir ?? 0) < 20 ? "text-orange-500" : "text-foreground"}`}>
                {statuses[0].pump!.reservoir}U
              </span>
            </span>
          )}
        </div>

      </CardContent>
    </Card>
    </div>
  );
}
