"use client";

import { useEffect, useState } from "react";
import {
  ComposedChart,
  Line,
  Area,
  ReferenceLine,
  ReferenceArea,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { AR2ConePoint, AR2Point } from "@/lib/nightscout/ar2";
import type { Entry, Treatment } from "@/types/nightscout";
import type { BasalPoint } from "@/lib/nightscout/basal";

interface LoopPredicted {
  startDate: string;
  values: number[]; // mg/dL, 5-min steps
}

interface Props {
  entries: Entry[];
  predicted:  AR2Point[];
  cone:       AR2ConePoint[];
  treatments?: Treatment[];
  loopPredicted?: LoopPredicted | null;
  basalTimeline?: BasalPoint[];
  targetLow?:   number;
  targetHigh?:  number;
  urgentLow?:   number;
  urgentHigh?:  number;
  unit?: "mg/dl" | "mmol";
  focusHours?: number;
  bolusDisplayThreshold?: number;
  timeFormat?: "12" | "24";
  onHover?: (point: { mills: number; sgv: number } | null) => void;
  chartHeight?: number;
  autoScale?: boolean;
  compact?: boolean;
}

function toDisplayMgdl(v: number, unit: "mg/dl" | "mmol") {
  if (unit === "mmol") return Math.round((v / 18.01559) * 10) / 10;
  return Math.round(v);
}

function makeFormatTime(hour12: boolean) {
  return (mills: number) =>
    new Date(mills).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12 });
}


function useIsDark() {
  const [dark, setDark] = useState(
    () => typeof window !== "undefined" && document.documentElement.classList.contains("dark")
  );
  useEffect(() => {
    const el = document.documentElement;
    const obs = new MutationObserver(() => setDark(el.classList.contains("dark")));
    obs.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

const T_COLOR: Record<string, string> = {
  "Meal Bolus":       "#3b82f6",
  "Correction Bolus": "#8b5cf6",
  "Snack Bolus":      "#60a5fa",
  "Carb Correction":  "#f97316",
  "Site Change":      "#22c55e",
  "Sensor Start":     "#a855f7",
  "Sensor Change":    "#a855f7",
  "Temp Basal":       "#06b6d4",
  "BG Check":         "#94a3b8",
};

function TreatmentDot(props: Record<string, unknown>) {
  const { cx, cy, payload } = props as { cx?: number; cy?: number; payload?: Record<string, unknown> };
  if (!cx || !cy || !payload?.t_type) return null;

  const type    = String(payload.t_type);
  const insulin = payload.t_insulin as number | undefined;
  const carbs   = payload.t_carbs   as number | undefined;
  const color   = T_COLOR[type] ?? "#94a3b8";

  const isSiteChange   = type === "Site Change";
  const isSensorChange = type.startsWith("Sensor");

  return (
    <g>
      {isSiteChange ? (
        <polygon points={`${cx},${cy - 7} ${cx - 6},${cy + 5} ${cx + 6},${cy + 5}`} fill={color} opacity={0.9} />
      ) : isSensorChange ? (
        <rect x={cx - 5} y={cy - 5} width={10} height={10} fill={color} opacity={0.9} />
      ) : (
        <circle cx={cx} cy={cy} r={6} fill={color} opacity={0.9} />
      )}
      {insulin != null && (
        <text x={cx} y={cy - 10} textAnchor="middle" fontSize={10} fontWeight={600} fill={color}>{insulin}U</text>
      )}
      {carbs != null && insulin == null && (
        <text x={cx} y={cy - 10} textAnchor="middle" fontSize={10} fontWeight={600} fill={color}>{carbs}g</text>
      )}
      {carbs != null && insulin != null && (
        <text x={cx} y={cy + 18} textAnchor="middle" fontSize={10} fill={color}>{carbs}g</text>
      )}
    </g>
  );
}

export function GlucoseChart({
  entries,
  predicted,
  cone,
  treatments = [],
  loopPredicted,
  basalTimeline = [],
  targetLow  = 70,
  targetHigh = 180,
  urgentLow  = 55,
  urgentHigh = 260,
  unit = "mg/dl",
  focusHours = 24,
  bolusDisplayThreshold = 0,
  timeFormat = "24",
  onHover,
  autoScale = false,
  compact = false,
}: Props) {
  const formatTime = makeFormatTime(timeFormat === "12");
  const isDark = useIsDark();
  const tickColor   = isDark ? "#9ca3af" : "#6b7280";
  const gridColor   = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)";
  const cardBg      = isDark ? "#1c1c1e" : "#ffffff";
  const borderColor = isDark ? "#374151" : "#e5e7eb";

  // Thresholds in display units — needed during data building
  const tLow  = toDisplayMgdl(targetLow,  unit);
  const tHigh = toDisplayMgdl(targetHigh, unit);
  const uLow  = toDisplayMgdl(urgentLow,  unit);
  const uHigh = toDisplayMgdl(urgentHigh, unit);

  // eslint-disable-next-line react-hooks/purity
  const windowStart = Date.now() - focusHours * 3600_000;
  // eslint-disable-next-line react-hooks/purity
  const windowEnd   = Date.now() + 30 * 60_000; // 30-min AR2 forecast buffer

  const histData = entries
    .filter((e) => e.sgv && e.sgv > 0 && e.date >= windowStart)
    .sort((a, b) => a.date - b.date)
    .map((e) => ({ mills: e.date, sgv: toDisplayMgdl(e.sgv!, unit) }));

  const forecastData = predicted.map((p) => ({
    mills: p.mills,
    forecast: toDisplayMgdl(p.mgdl, unit),
  }));

  const coneData = cone.map((p) => ({
    mills: p.mills,
    coneLow:  toDisplayMgdl(p.mgdlLow,  unit),
    coneHigh: toDisplayMgdl(p.mgdlHigh, unit),
  }));

  // Loop prediction points
  const loopData: { mills: number; loopForecast: number }[] = [];
  if (loopPredicted?.values?.length) {
    const start = new Date(loopPredicted.startDate).getTime();
    loopPredicted.values.forEach((v, i) => {
      loopData.push({ mills: start + i * 5 * 60_000, loopForecast: toDisplayMgdl(v, unit) });
    });
  }

  // Build merged data map
  const allMills = [
    ...histData.map((d) => d.mills),
    ...forecastData.map((d) => d.mills),
    ...coneData.map((d) => d.mills),
    ...loopData.map((d) => d.mills),
    ...basalTimeline.map((d) => d.mills),
  ].sort((a, b) => a - b);

  const millsToData = new Map<number, Record<string, unknown>>();
  for (const m of allMills) millsToData.set(m, { mills: m });

  // Zone-colored sgv — assign each point to its BG zone key + add boundary crossings
  for (let i = 0; i < histData.length; i++) {
    const d = histData[i];
    const zone = d.sgv <= uLow ? "sgv_ulow" : d.sgv < tLow ? "sgv_low"
               : d.sgv <= tHigh ? "sgv_ok" : d.sgv <= uHigh ? "sgv_high" : "sgv_uhigh";
    const entry = millsToData.get(d.mills)!;
    entry.sgv = d.sgv; // keep for hover/tooltip
    entry[zone] = d.sgv;

    if (i > 0) {
      const prev = histData[i - 1];
      const prevZone = prev.sgv <= uLow ? "sgv_ulow" : prev.sgv < tLow ? "sgv_low"
                     : prev.sgv <= tHigh ? "sgv_ok" : prev.sgv <= uHigh ? "sgv_high" : "sgv_uhigh";
      if (prevZone !== zone) {
        const ths = [uLow, tLow, tHigh, uHigh].filter(
          (th) => Math.min(prev.sgv, d.sgv) <= th && th <= Math.max(prev.sgv, d.sgv)
        );
        for (const th of ths) {
          const frac = (th - prev.sgv) / (d.sgv - prev.sgv);
          const tm = Math.round(prev.mills + frac * (d.mills - prev.mills));
          if (!millsToData.has(tm)) millsToData.set(tm, { mills: tm });
          const cross = millsToData.get(tm)!;
          cross.sgv = th;
          cross[prevZone] = th;
          cross[zone] = th;
        }
      }
    }
  }

  for (const d of forecastData) millsToData.get(d.mills)!.forecast      = d.forecast;
  for (const d of coneData) {
    millsToData.get(d.mills)!.coneLow  = d.coneLow;
    millsToData.get(d.mills)!.coneHigh = d.coneHigh;
  }
  for (const d of loopData)       millsToData.get(d.mills)!.loopForecast = d.loopForecast;
  for (const d of basalTimeline)  millsToData.get(d.mills)!.basal        = d.rate;

  // Treatment markers
  const minMills = allMills[0] ?? 0;
  const maxMills = allMills[allMills.length - 1] ?? Infinity;
  const SHOWN_TYPES = new Set([
    "Meal Bolus","Correction Bolus","Snack Bolus","Carb Correction",
    "Site Change","Sensor Start","Sensor Change","Temp Basal","BG Check",
  ]);

  for (const t of treatments) {
    const tm = t.timestamp ?? new Date(t.created_at).getTime();
    if (tm < minMills || tm > maxMills || !SHOWN_TYPES.has(t.eventType)) continue;
    // Skip bolus markers below the display threshold
    if (bolusDisplayThreshold > 0 && t.insulin != null && t.insulin < bolusDisplayThreshold) continue;

    let nearestSgv: number | undefined, nearestDiff = Infinity;
    for (const d of histData) {
      const diff = Math.abs(d.mills - tm);
      if (diff < nearestDiff) { nearestDiff = diff; nearestSgv = d.sgv; }
    }
    if (nearestSgv == null || nearestDiff > 15 * 60_000) continue;

    let key = tm;
    if (!millsToData.has(tm)) {
      let bestKey = tm, bestDiff = Infinity;
      for (const k of millsToData.keys()) {
        const diff = Math.abs(k - tm);
        if (diff < bestDiff) { bestDiff = diff; bestKey = k; }
      }
      key = bestDiff < 2.5 * 60_000 ? bestKey : tm;
      if (!millsToData.has(key)) millsToData.set(key, { mills: key });
    }
    const entry = millsToData.get(key)!;
    entry.t_y       = nearestSgv;
    entry.t_type    = t.eventType;
    entry.t_insulin = t.insulin;
    entry.t_carbs   = t.carbs;
  }

  const chartData = Array.from(millsToData.values()).sort((a, b) =>
    (a.mills as number) - (b.mills as number)
  );

  // Y-axis domain: either threshold-based (full) or fitted to visible data (auto)
  const yDomain: [number, number] = (() => {
    if (!autoScale) return [Math.max(0, uLow - 20), uHigh + 40];
    const vals = [
      ...histData.map((d) => d.sgv),
      ...forecastData.map((d) => d.forecast as number),
      ...coneData.flatMap((d) => [d.coneLow as number, d.coneHigh as number]),
      ...loopData.map((d) => d.loopForecast as number),
    ].filter((v) => v != null && isFinite(v));
    if (!vals.length) return [Math.max(0, uLow - 20), uHigh + 40];
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    const pad = Math.max(unit === "mmol" ? 1 : 15, (hi - lo) * 0.12);
    return [Math.max(0, Math.floor(lo - pad)), Math.ceil(hi + pad)];
  })();
  const unitLabel = unit === "mmol" ? "mmol/L" : "mg/dL";

  // Temporary target bands
  const tempTargetBands = treatments
    .filter((t) => t.eventType === "Temporary Target" && t.duration != null)
    .map((t) => {
      const start = t.timestamp ?? new Date(t.created_at).getTime();
      const end   = start + (t.duration ?? 0) * 60_000;
      const lo    = t.targetBottom != null ? toDisplayMgdl(t.targetBottom, unit) : tLow;
      const hi    = t.targetTop    != null ? toDisplayMgdl(t.targetTop,    unit) : tHigh;
      return { start, end, lo, hi };
    })
    .filter((b) => b.end >= windowStart);

  const maxBasal  = basalTimeline.length
    ? Math.max(...basalTimeline.map((b) => b.rate)) * 2.5
    : 3;
  const hasBasal  = basalTimeline.length > 0;
  const hasLoop   = loopData.length > 0;

  const yAxisWidth  = compact ? 28 : 40;
  const tickFontSize = compact ? 10 : 11;
  const chartMargin = {
    top:    compact ? 6 : 14,
    right:  hasBasal ? (compact ? 30 : 46) : (compact ? 4 : 12),
    bottom: 0,
    left:   0,
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart
        data={chartData}
        margin={chartMargin}
        onMouseMove={(state) => {
          if (!onHover) return;
          const s = state as Record<string, unknown>;
          const payload = (s?.activePayload as { payload?: Record<string, unknown> }[] | undefined)?.[0]?.payload;
          if (payload?.mills != null && payload?.sgv != null) {
            onHover({ mills: payload.mills as number, sgv: payload.sgv as number });
          } else {
            onHover(null);
          }
        }}
        onMouseLeave={() => onHover?.(null)}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />

        <XAxis
          dataKey="mills" type="number" scale="time"
          domain={[windowStart, windowEnd]}
          tickFormatter={formatTime}
          tick={{ fontSize: tickFontSize, fill: tickColor }}
          tickLine={false} axisLine={false}
          minTickGap={compact ? 80 : 60}
        />

        {/* Primary Y axis — glucose */}
        <YAxis
          yAxisId={0}
          domain={yDomain}
          tick={{ fontSize: tickFontSize, fill: tickColor }}
          tickLine={false} axisLine={false} width={yAxisWidth}
          label={compact ? undefined : {
            value: unitLabel, angle: -90, position: "insideLeft",
            style: { fontSize: 10, fill: tickColor },
          }}
        />

        {/* Secondary Y axis — basal rate (right side) */}
        {hasBasal && (
          <YAxis
            yAxisId={1}
            orientation="right"
            domain={[0, maxBasal]}
            tick={{ fontSize: compact ? 8 : 9, fill: "#22d3ee" }}
            tickLine={false} axisLine={false} width={compact ? 26 : 36}
            tickFormatter={(v) => `${v}U`}
            label={compact ? undefined : {
              value: "Basal", angle: 90, position: "insideRight",
              style: { fontSize: 9, fill: "#06b6d4" },
            }}
          />
        )}

        <Tooltip
          labelFormatter={(v) => formatTime(Number(v))}
          formatter={(val, name) => {
            if (val == null) return null as unknown as [string, string];
            const key = String(name ?? "");
            if (key === "basal") return [`${Number(val).toFixed(3)} U/hr`, "Basal"];
            const rounded = unit === "mmol"
              ? Number(val).toFixed(1)
              : String(Math.round(Number(val)));
            const labels: Record<string, string> = {
              sgv_ulow: "BG", sgv_low: "BG", sgv_ok: "BG", sgv_high: "BG", sgv_uhigh: "BG",
              forecast: "AR2", loopForecast: "Loop",
              coneLow: "Cone ↓", coneHigh: "Cone ↑", t_y: "BG",
            };
            return [`${rounded} ${unitLabel}`, labels[key] ?? key];
          }}
          contentStyle={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 8, fontSize: 12, color: tickColor }}
        />

        {/* Temporary target bands */}
        {tempTargetBands.map((b, i) => (
          <ReferenceArea
            key={i} yAxisId={0}
            x1={b.start} x2={b.end} y1={b.lo} y2={b.hi}
            fill="#38bdf8" fillOpacity={0.12}
            stroke="#38bdf8" strokeOpacity={0.4} strokeWidth={1}
          />
        ))}

        {/* Threshold reference lines */}
        <ReferenceLine yAxisId={0} y={tLow}  stroke="#f59e0b" strokeDasharray="4 3" strokeWidth={1} />
        <ReferenceLine yAxisId={0} y={tHigh} stroke="#f59e0b" strokeDasharray="4 3" strokeWidth={1} />
        <ReferenceLine yAxisId={0} y={uLow}  stroke="#ef4444" strokeDasharray="4 3" strokeWidth={1} />
        <ReferenceLine yAxisId={0} y={uHigh} stroke="#ef4444" strokeDasharray="4 3" strokeWidth={1} />

        {/* Basal rate area (right axis) */}
        {hasBasal && (
          <Area
            yAxisId={1}
            dataKey="basal"
            stroke="#06b6d4"
            fill="#06b6d4"
            fillOpacity={0.15}
            strokeWidth={1.5}
            dot={false}
            activeDot={false}
            isAnimationActive={false}
            connectNulls
            legendType="none"
            type="stepAfter"
          />
        )}

        {/* AR2 cone bounds — dashed boundary lines, no problematic fill */}
        <Line yAxisId={0} dataKey="coneHigh" stroke="#93c5fd" strokeWidth={1} strokeDasharray="2 3"
          dot={false} isAnimationActive={false} connectNulls={false} legendType="none" activeDot={false} />
        <Line yAxisId={0} dataKey="coneLow" stroke="#93c5fd" strokeWidth={1} strokeDasharray="2 3"
          dot={false} isAnimationActive={false} connectNulls={false} legendType="none" activeDot={false} />

        {/* Loop prediction */}
        {hasLoop && (
          <Line
            yAxisId={0}
            dataKey="loopForecast"
            stroke="#f97316"
            strokeWidth={2}
            strokeDasharray="4 2"
            dot={false}
            isAnimationActive={false}
            connectNulls
            legendType="none"
          />
        )}

        {/* AR2 forecast */}
        <Line yAxisId={0} dataKey="forecast" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 3"
          dot={false} isAnimationActive={false} connectNulls />

        {/* Zone-colored SGV lines — one per BG zone */}
        {(
          [
            ["sgv_ulow",  "#ef4444"],
            ["sgv_low",   "#f97316"],
            ["sgv_ok",    "#22c55e"],
            ["sgv_high",  "#eab308"],
            ["sgv_uhigh", "#ef4444"],
          ] as [string, string][]
        ).map(([key, color]) => (
          <Line
            key={key}
            yAxisId={0}
            dataKey={key}
            stroke={color}
            strokeWidth={2}
            dot={(props: Record<string, unknown>) => {
              const { cx, cy } = props as { cx?: number; cy?: number };
              if (!cx || !cy) return <g key={String(props.index)} />;
              return <circle key={String(props.index)} cx={cx} cy={cy} r={2.5} fill={color} strokeWidth={0} />;
            }}
            activeDot={{ r: 5, fill: color, strokeWidth: 0 }}
            isAnimationActive={false}
            connectNulls={false}
            legendType="none"
          />
        ))}

        {/* Treatment markers */}
        <Line
          yAxisId={0}
          dataKey="t_y"
          stroke="none"
          dot={(props: Record<string, unknown>) => <TreatmentDot key={String(props.index)} {...props} />}
          activeDot={false}
          isAnimationActive={false}
          connectNulls={false}
          legendType="none"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
