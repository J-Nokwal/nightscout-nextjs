"use client";

import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer,
} from "recharts";
import { useChartTheme } from "./useChartTheme";
import type { Entry } from "@/types/nightscout";

interface Props {
  entries: Entry[];
  targetLow?: number;
  targetHigh?: number;
  unit?: "mg/dl" | "mmol";
}

function toDisplay(v: number, unit: "mg/dl" | "mmol") {
  return unit === "mmol" ? Math.round((v / 18.01559) * 10) / 10 : Math.round(v);
}

export function HourlyStatsChart({
  entries,
  targetLow  = 70,
  targetHigh = 180,
  unit = "mg/dl",
}: Props) {
  const { tooltipStyle, tickColor, gridColor, isDark } = useChartTheme();
  const sgvByHour = Array.from({ length: 24 }, () => [] as number[]);

  for (const e of entries) {
    if (!e.sgv || e.sgv <= 0) continue;
    const hour = new Date(e.date).getHours();
    sgvByHour[hour].push(toDisplay(e.sgv, unit));
  }

  const data = sgvByHour.map((vals, hour) => {
    if (!vals.length) return { hour, count: 0 };
    const sorted = [...vals].sort((a, b) => a - b);
    const mean   = Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
    const p25    = sorted[Math.floor(sorted.length * 0.25)];
    const p75    = sorted[Math.floor(sorted.length * 0.75)];
    const p10    = sorted[Math.floor(sorted.length * 0.10)];
    const p90    = sorted[Math.floor(sorted.length * 0.90)];
    return { hour, mean, p25, p75, p10, p90, count: vals.length };
  });

  const tLow  = toDisplay(targetLow,  unit);
  const tHigh = toDisplay(targetHigh, unit);
  const unitLabel = unit === "mmol" ? "mmol/L" : "mg/dL";

  const hasData = data.some((d) => d.count > 0);
  if (!hasData) return <p className="text-sm text-muted-foreground py-4">No data available.</p>;

  return (
    <ResponsiveContainer width="100%" height={320}>
      <ComposedChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
        <XAxis
          dataKey="hour"
          tick={{ fontSize: 10, fill: tickColor }}
          tickLine={false} axisLine={false}
          tickFormatter={(h) => `${String(h).padStart(2, "0")}:00`}
        />
        <YAxis
          tick={{ fontSize: 10, fill: tickColor }}
          tickLine={false} axisLine={false}
          label={{ value: unitLabel, angle: -90, position: "insideLeft",
            style: { fontSize: 10, fill: tickColor } }}
        />
        <Tooltip
          formatter={(v, name) => {
            const labels: Record<string, string> = {
              p10: "10th pct", p25: "25th pct", mean: "Mean",
              p75: "75th pct", p90: "90th pct",
            };
            return [`${v} ${unitLabel}`, labels[String(name)] ?? String(name)];
          }}
          labelFormatter={(h) => `${String(h).padStart(2, "0")}:00`}
          contentStyle={tooltipStyle}
        />
        <ReferenceLine y={tLow}  stroke="#f59e0b" strokeDasharray="4 2" strokeWidth={1} />
        <ReferenceLine y={tHigh} stroke="#f59e0b" strokeDasharray="4 2" strokeWidth={1} />

        {/* 10–90 band */}
        <Area dataKey="p90" stroke="none" fill="#22c55e" fillOpacity={0.1}
          isAnimationActive={false} legendType="none" dot={false} activeDot={false} />
        <Area dataKey="p10" stroke="none" fill={isDark ? "#111827" : "#ffffff"} fillOpacity={1}
          isAnimationActive={false} legendType="none" dot={false} activeDot={false} />

        {/* 25–75 band */}
        <Area dataKey="p75" stroke="none" fill="#22c55e" fillOpacity={0.25}
          isAnimationActive={false} legendType="none" dot={false} activeDot={false} />
        <Area dataKey="p25" stroke="none" fill={isDark ? "#111827" : "#ffffff"} fillOpacity={1}
          isAnimationActive={false} legendType="none" dot={false} activeDot={false} />

        {/* Mean line */}
        <Line dataKey="mean" stroke="#22c55e" strokeWidth={2}
          dot={{ r: 2, fill: "#22c55e", strokeWidth: 0 }}
          isAnimationActive={false} connectNulls />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
