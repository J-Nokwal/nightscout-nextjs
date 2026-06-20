"use client";

import {
  ComposedChart, Line, ReferenceLine, XAxis, YAxis,
  ResponsiveContainer, Tooltip,
} from "recharts";
import { useChartTheme } from "./useChartTheme";
import type { Entry } from "@/types/nightscout";

interface Props {
  entries: Entry[];
  targetLow?: number;
  targetHigh?: number;
  urgentLow?: number;
  urgentHigh?: number;
  unit?: "mg/dl" | "mmol";
  days?: number;
}

function toDisplay(v: number, unit: "mg/dl" | "mmol") {
  if (unit === "mmol") return Math.round((v / 18.01559) * 10) / 10;
  return Math.round(v);
}

function getMidnight(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function minutesOfDay(ms: number) {
  const d = new Date(ms);
  return d.getHours() * 60 + d.getMinutes();
}

export function DayToDayChart({
  entries,
  targetLow  = 70,
  targetHigh = 180,
  urgentLow  = 54,
  urgentHigh = 250,
  unit = "mg/dl",
  days = 14,
}: Props) {
  const { tooltipStyle } = useChartTheme();
  const tLow  = toDisplay(targetLow,  unit);
  const tHigh = toDisplay(targetHigh, unit);
  const uLow  = toDisplay(urgentLow,  unit);
  const uHigh = toDisplay(urgentHigh, unit);
  const yDomain = [Math.max(0, uLow - 10), uHigh + 20];
  const unitLabel = unit === "mmol" ? "mmol/L" : "mg/dL";

  // Group by calendar day (most recent first)
  // eslint-disable-next-line react-hooks/purity
  const cutoff = Date.now() - days * 24 * 3600_000;
  const byDay = new Map<number, { mins: number; sgv: number }[]>();

  for (const e of entries) {
    if (!e.sgv || e.date < cutoff) continue;
    const midnight = getMidnight(new Date(e.date));
    if (!byDay.has(midnight)) byDay.set(midnight, []);
    byDay.get(midnight)!.push({ mins: minutesOfDay(e.date), sgv: toDisplay(e.sgv, unit) });
  }

  const sortedDays = [...byDay.entries()]
    .sort((a, b) => b[0] - a[0])
    .slice(0, days);

  if (!sortedDays.length) {
    return <p className="text-sm text-muted-foreground py-4">No data available.</p>;
  }

  return (
    <div className="space-y-1">
      {sortedDays.map(([midnight, pts]) => {
        const label = new Date(midnight).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
        const data = pts.sort((a, b) => a.mins - b.mins);
        return (
          <div key={midnight} className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-24 shrink-0 text-right">{label}</span>
            <div className="flex-1 h-12">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
                  <XAxis dataKey="mins" type="number" domain={[0, 1440]} hide />
                  <YAxis domain={yDomain} hide />
                  <Tooltip
                    formatter={(v) => [`${v} ${unitLabel}`, "BG"]}
                    labelFormatter={(v) => {
                      const h = Math.floor(Number(v) / 60).toString().padStart(2, "0");
                      const m = (Number(v) % 60).toString().padStart(2, "0");
                      return `${h}:${m}`;
                    }}
                    contentStyle={tooltipStyle}
                  />
                  <ReferenceLine y={tLow}  stroke="#f59e0b" strokeWidth={1} strokeDasharray="3 2" />
                  <ReferenceLine y={tHigh} stroke="#f59e0b" strokeWidth={1} strokeDasharray="3 2" />
                  <Line
                    dataKey="sgv"
                    stroke="#22c55e"
                    strokeWidth={1.5}
                    dot={{ r: 1, fill: "#22c55e", strokeWidth: 0 }}
                    activeDot={{ r: 3 }}
                    isAnimationActive={false}
                    connectNulls
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      })}
    </div>
  );
}
