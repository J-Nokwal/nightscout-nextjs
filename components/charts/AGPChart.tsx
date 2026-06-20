"use client";

import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { useChartTheme } from "./useChartTheme";
import type { AGPSlot } from "@/lib/nightscout/agp";

interface Props {
  data:       AGPSlot[];
  unit?:      "mg/dl" | "mmol";
  targetLow?:  number;
  targetHigh?: number;
}

function minToLabel(min: number) {
  const h = Math.floor(min / 60).toString().padStart(2, "0");
  const m = (min % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

function conv(v: number, unit: "mg/dl" | "mmol") {
  return unit === "mmol" ? Math.round((v / 18.01559) * 10) / 10 : v;
}

export function AGPChart({ data, unit = "mg/dl", targetLow = 70, targetHigh = 180 }: Props) {
  const { tooltipStyle, tickColor, gridColor, isDark } = useChartTheme();
  const chartData = data.map((s) => ({
    min:  s.minuteOfDay,
    p10:  conv(s.p10,  unit),
    p25:  conv(s.p25,  unit),
    p50:  conv(s.p50,  unit),
    p75:  conv(s.p75,  unit),
    p90:  conv(s.p90,  unit),
    // recharts area stacking workaround: use [p10, p90] and [p25, p75] as [low, high] bands
    band90: [conv(s.p10, unit), conv(s.p90, unit)] as [number, number],
    band75: [conv(s.p25, unit), conv(s.p75, unit)] as [number, number],
  }));

  const unitLabel  = unit === "mmol" ? "mmol/L" : "mg/dL";
  const tLow  = conv(targetLow,  unit);
  const tHigh = conv(targetHigh, unit);

  return (
    <ResponsiveContainer width="100%" height={320}>
      <ComposedChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
        <XAxis
          dataKey="min"
          type="number"
          domain={[0, 1410]}
          ticks={[0, 180, 360, 540, 720, 900, 1080, 1260, 1410]}
          tickFormatter={minToLabel}
          tick={{ fontSize: 11, fill: tickColor }}
          tickLine={false} axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: tickColor }}
          tickLine={false} axisLine={false} width={42}
          label={{ value: unitLabel, angle: -90, position: "insideLeft",
            style: { fontSize: 10, fill: tickColor } }}
        />
        <Tooltip
          labelFormatter={(v) => minToLabel(Number(v))}
          formatter={(val, name) => {
            if (val == null) return ["-", String(name ?? "")];
            const labels: Record<string, string> = {
              p50: "Median (p50)", p25: "p25", p75: "p75", p10: "p10", p90: "p90",
            };
            const rounded = unit === "mmol" ? Number(val).toFixed(1) : String(Math.round(Number(val)));
            return [`${rounded} ${unitLabel}`, labels[String(name ?? "")] ?? String(name)];
          }}
          contentStyle={{ ...tooltipStyle, fontSize: 12 }}
        />

        <ReferenceLine y={tLow}  stroke="#f59e0b" strokeDasharray="4 3" strokeWidth={1} />
        <ReferenceLine y={tHigh} stroke="#f59e0b" strokeDasharray="4 3" strokeWidth={1} />

        {/* p10–p90 outer band */}
        <Area dataKey="p90" stroke="none" fill="#3b82f6" fillOpacity={0.12}
          isAnimationActive={false} connectNulls dot={false} activeDot={false} legendType="none" />
        <Area dataKey="p10" stroke="none" fill={isDark ? "#111827" : "#ffffff"} fillOpacity={1}
          isAnimationActive={false} connectNulls dot={false} activeDot={false} legendType="none" />

        {/* p25–p75 inner band */}
        <Area dataKey="p75" stroke="none" fill="#3b82f6" fillOpacity={0.25}
          isAnimationActive={false} connectNulls dot={false} activeDot={false} legendType="none" />
        <Area dataKey="p25" stroke="none" fill={isDark ? "#111827" : "#ffffff"} fillOpacity={1}
          isAnimationActive={false} connectNulls dot={false} activeDot={false} legendType="none" />

        {/* Median line */}
        <Line dataKey="p50" stroke="#3b82f6" strokeWidth={2.5}
          dot={false} isAnimationActive={false} connectNulls legendType="none" />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
