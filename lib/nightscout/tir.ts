import type { Entry } from "@/types/nightscout";

export interface TIRResult {
  veryLow: number;  // %
  low: number;
  inRange: number;
  high: number;
  veryHigh: number;
  count: number;
}

export interface TIRThresholds {
  urgentLow: number;
  low: number;
  high: number;
  urgentHigh: number;
}

export function calcTIR(entries: Entry[], thresholds: TIRThresholds): TIRResult {
  const sgvs = entries.filter((e) => e.sgv && e.sgv > 0).map((e) => e.sgv!);
  if (!sgvs.length) return { veryLow: 0, low: 0, inRange: 0, high: 0, veryHigh: 0, count: 0 };

  let veryLow = 0, low = 0, inRange = 0, high = 0, veryHigh = 0;
  for (const v of sgvs) {
    if (v < thresholds.urgentLow)      veryLow++;
    else if (v < thresholds.low)       low++;
    else if (v <= thresholds.high)     inRange++;
    else if (v <= thresholds.urgentHigh) high++;
    else                               veryHigh++;
  }

  const n = sgvs.length;
  return {
    veryLow:  Math.round((veryLow  / n) * 100),
    low:      Math.round((low      / n) * 100),
    inRange:  Math.round((inRange  / n) * 100),
    high:     Math.round((high     / n) * 100),
    veryHigh: Math.round((veryHigh / n) * 100),
    count:    n,
  };
}
