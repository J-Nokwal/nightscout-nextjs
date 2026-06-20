import type { Entry } from "@/types/nightscout";

export interface AGPSlot {
  minuteOfDay: number; // 0–1410, step 30
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  count: number;
}

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const idx = (p / 100) * (sorted.length - 1);
  const lo  = Math.floor(idx);
  const hi  = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

/** Compute 30-min-slot AGP percentiles from a set of entries (ideally ≥14 days). */
export function calcAGP(entries: Entry[]): AGPSlot[] {
  const SLOT_MIN = 30;
  const SLOTS    = (24 * 60) / SLOT_MIN; // 48

  const buckets: number[][] = Array.from({ length: SLOTS }, () => []);

  for (const e of entries) {
    if (!e.sgv || e.sgv <= 0) continue;
    const d   = new Date(e.date);
    const min = d.getHours() * 60 + d.getMinutes();
    const idx = Math.floor(min / SLOT_MIN) % SLOTS;
    buckets[idx].push(e.sgv);
  }

  return buckets.map((vals, i) => {
    const sorted = [...vals].sort((a, b) => a - b);
    return {
      minuteOfDay: i * SLOT_MIN,
      p10:   Math.round(percentile(sorted, 10)),
      p25:   Math.round(percentile(sorted, 25)),
      p50:   Math.round(percentile(sorted, 50)),
      p75:   Math.round(percentile(sorted, 75)),
      p90:   Math.round(percentile(sorted, 90)),
      count: sorted.length,
    };
  });
}
