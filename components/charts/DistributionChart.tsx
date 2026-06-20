"use client";

import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from "recharts";
import { useChartTheme } from "./useChartTheme";
import type { Entry } from "@/types/nightscout";

interface Props {
  entries: Entry[];
  targetLow?: number;
  targetHigh?: number;
  urgentLow?: number;
  urgentHigh?: number;
  unit?: "mg/dl" | "mmol";
}

function toDisplay(v: number, unit: "mg/dl" | "mmol") {
  return unit === "mmol" ? Math.round((v / 18.01559) * 10) / 10 : v;
}

export function DistributionChart({
  entries,
  targetLow  = 70,
  targetHigh = 180,
  urgentLow  = 54,
  urgentHigh = 250,
  unit = "mg/dl",
}: Props) {
  const { tooltipStyle, tickColor, gridColor } = useChartTheme();
  const sgvs = entries.filter((e) => e.sgv && e.sgv > 0).map((e) => e.sgv!);
  if (!sgvs.length) return <p className="text-sm text-muted-foreground py-4">No data available.</p>;

  const bucketSize = unit === "mmol" ? 0.5 : 10;
  const counts = new Map<number, number>();

  for (const v of sgvs) {
    const disp = toDisplay(v, unit);
    const bucket = Math.floor(disp / bucketSize) * bucketSize;
    counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
  }

  const total = sgvs.length;
  const data = [...counts.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([x, cnt]) => ({ x, pct: Math.round((cnt / total) * 1000) / 10 }));

  const tLow  = toDisplay(targetLow,  unit);
  const tHigh = toDisplay(targetHigh, unit);
  const uLow  = toDisplay(urgentLow,  unit);
  const uHigh = toDisplay(urgentHigh, unit);
  const unitLabel = unit === "mmol" ? "mmol/L" : "mg/dL";

  function barColor(x: number) {
    if (x < uLow)   return "#7f1d1d";
    if (x < tLow)   return "#f97316";
    if (x <= tHigh) return "#22c55e";
    if (x <= uHigh) return "#f59e0b";
    return "#dc2626";
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
        <XAxis
          dataKey="x"
          tick={{ fontSize: 10, fill: tickColor }}
          tickLine={false} axisLine={false}
          tickFormatter={(v) => unit === "mmol" ? v.toFixed(1) : String(v)}
          label={{ value: unitLabel, position: "insideBottom", offset: -2, style: { fontSize: 10, fill: tickColor } }}
        />
        <YAxis
          tick={{ fontSize: 10, fill: tickColor }}
          tickLine={false} axisLine={false}
          tickFormatter={(v) => `${v}%`}
        />
        <Tooltip
          formatter={(v) => [`${v}%`, "% readings"]}
          labelFormatter={(v) => `${unit === "mmol" ? Number(v).toFixed(1) : v} ${unitLabel}`}
          contentStyle={tooltipStyle}
        />
        <ReferenceLine x={tLow}  stroke="#f59e0b" strokeDasharray="4 2" />
        <ReferenceLine x={tHigh} stroke="#f59e0b" strokeDasharray="4 2" />
        <ReferenceLine x={uLow}  stroke="#ef4444" strokeDasharray="4 2" />
        <ReferenceLine x={uHigh} stroke="#ef4444" strokeDasharray="4 2" />
        <Bar dataKey="pct" isAnimationActive={false}>
          {data.map(({ x }, i) => (
            <Cell key={i} fill={barColor(x)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
