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
  unit?: "mg/dl" | "mmol";
  weeks?: number;
}

function toDisplay(v: number, unit: "mg/dl" | "mmol") {
  return unit === "mmol" ? Math.round((v / 18.01559) * 10) / 10 : Math.round(v);
}

function getWeekStart(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay()); // Sunday
  return d.getTime();
}

function minutesOfWeek(ms: number) {
  const d = new Date(ms);
  return d.getDay() * 24 * 60 + d.getHours() * 60 + d.getMinutes();
}

export function WeekToWeekChart({
  entries,
  targetLow = 70,
  targetHigh = 180,
  unit = "mg/dl",
  weeks = 8,
}: Props) {
  const { tooltipStyle } = useChartTheme();
  const tLow  = toDisplay(targetLow,  unit);
  const tHigh = toDisplay(targetHigh, unit);
  const unitLabel = unit === "mmol" ? "mmol/L" : "mg/dL";
  const yDomain = [Math.max(0, tLow - 20), tHigh + 40];

  // eslint-disable-next-line react-hooks/purity
  const cutoff = Date.now() - weeks * 7 * 24 * 3600_000;
  const byWeek = new Map<number, { mins: number; sgv: number }[]>();

  for (const e of entries) {
    if (!e.sgv || e.date < cutoff) continue;
    const ws = getWeekStart(new Date(e.date));
    if (!byWeek.has(ws)) byWeek.set(ws, []);
    byWeek.get(ws)!.push({ mins: minutesOfWeek(e.date), sgv: toDisplay(e.sgv, unit) });
  }

  const sortedWeeks = [...byWeek.entries()]
    .sort((a, b) => b[0] - a[0])
    .slice(0, weeks);

  const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  if (!sortedWeeks.length) {
    return <p className="text-sm text-muted-foreground py-4">No data available.</p>;
  }

  return (
    <div className="space-y-1">
      {sortedWeeks.map(([weekStart, pts]) => {
        const label = new Date(weekStart).toLocaleDateString([], { month: "short", day: "numeric" });
        const data = pts.sort((a, b) => a.mins - b.mins);
        return (
          <div key={weekStart} className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-20 shrink-0 text-right">{label}</span>
            <div className="flex-1 h-12">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
                  <XAxis
                    dataKey="mins" type="number" domain={[0, 7 * 24 * 60]} hide
                    ticks={[0, 1440, 2880, 4320, 5760, 7200, 8640]}
                  />
                  <YAxis domain={yDomain} hide />
                  <Tooltip
                    formatter={(v) => [`${v} ${unitLabel}`, "BG"]}
                    labelFormatter={(v) => {
                      const dayIdx = Math.floor(Number(v) / (24 * 60));
                      const minInDay = Number(v) % (24 * 60);
                      const h = Math.floor(minInDay / 60).toString().padStart(2, "0");
                      const m = (minInDay % 60).toString().padStart(2, "0");
                      return `${DAY_LABELS[dayIdx] ?? ""} ${h}:${m}`;
                    }}
                    contentStyle={tooltipStyle}
                  />
                  <ReferenceLine y={tLow}  stroke="#f59e0b" strokeWidth={1} strokeDasharray="3 2" />
                  <ReferenceLine y={tHigh} stroke="#f59e0b" strokeWidth={1} strokeDasharray="3 2" />
                  <Line
                    dataKey="sgv"
                    stroke="#8b5cf6"
                    strokeWidth={1.5}
                    dot={{ r: 1, fill: "#8b5cf6", strokeWidth: 0 }}
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
      <div className="flex ml-24 text-xs text-muted-foreground gap-0 mt-1">
        {DAY_LABELS.map((d) => (
          <div key={d} style={{ flex: 1 }}>{d}</div>
        ))}
      </div>
    </div>
  );
}
