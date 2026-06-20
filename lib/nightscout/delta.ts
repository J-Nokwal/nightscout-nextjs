import type { Entry } from "@/types/nightscout";

export interface DeltaResult {
  /** Raw mg/dL difference between current and ~5 min ago reading */
  mgdl: number;
  /** Rate of change in mg/dL per minute */
  mgdlPerMin: number;
  /** Glucose value ~5 minutes ago used for delta (mg/dL) */
  mean5MinsAgo: number;
  /** Display string e.g. "+3", "-12", "---" */
  display: string;
  /** Short display with units e.g. "+3 mg/dL" */
  displayWithUnits: string;
}

const FIVE_MINS_MS = 5 * 60 * 1000;
const MAX_DELTA_WINDOW_MS = 10 * 60 * 1000; // accept readings up to 10 min apart

export function calcDelta(entries: Entry[]): DeltaResult | null {
  const sgvs = entries.filter((e) => e.sgv !== undefined && e.sgv > 0).sort((a, b) => b.date - a.date);

  if (sgvs.length < 2) return null;

  const current = sgvs[0];
  // Find the reading closest to 5 minutes ago
  const targetTime = current.date - FIVE_MINS_MS;
  const prev = sgvs
    .slice(1)
    .filter((e) => Math.abs(e.date - targetTime) <= MAX_DELTA_WINDOW_MS)
    .sort((a, b) => Math.abs(a.date - targetTime) - Math.abs(b.date - targetTime))[0];

  if (!prev || !current.sgv || !prev.sgv) return null;

  const timeDiffMins = (current.date - prev.date) / 60000;
  if (timeDiffMins <= 0) return null;

  const mgdl = current.sgv - prev.sgv;
  const mgdlPerMin = mgdl / timeDiffMins;

  const sign = mgdl >= 0 ? "+" : "";
  const display = Math.abs(mgdl) < 1 ? "→" : `${sign}${Math.round(mgdl)}`;

  return {
    mgdl,
    mgdlPerMin,
    mean5MinsAgo: prev.sgv,
    display,
    displayWithUnits: `${display} mg/dL`,
  };
}
