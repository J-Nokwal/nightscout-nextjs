import type { Entry } from "@/types/nightscout";

export interface GlucoseStats {
  mean: number;   // mg/dL
  sd: number;
  cv: number;     // % coefficient of variation
  a1c: number;    // estimated A1c % — ADAG formula: (mean + 46.7) / 28.7
  min: number;
  max: number;
  count: number;
}

export function calcGlucoseStats(entries: Entry[]): GlucoseStats | null {
  const sgvs = entries.filter((e) => e.sgv && e.sgv > 0).map((e) => e.sgv!);
  if (!sgvs.length) return null;

  const mean = sgvs.reduce((s, v) => s + v, 0) / sgvs.length;
  const variance = sgvs.reduce((s, v) => s + (v - mean) ** 2, 0) / sgvs.length;
  const sd  = Math.sqrt(variance);
  const cv  = (sd / mean) * 100;
  const a1c = (mean + 46.7) / 28.7; // ADAG

  return {
    mean: Math.round(mean),
    sd:   Math.round(sd),
    cv:   Math.round(cv),
    a1c:  Math.round(a1c * 10) / 10,
    min:  Math.min(...sgvs),
    max:  Math.max(...sgvs),
    count: sgvs.length,
  };
}
