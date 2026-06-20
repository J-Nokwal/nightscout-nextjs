import type { Entry } from "@/types/nightscout";

export type AlarmLevel = "urgent-low" | "low" | "normal" | "high" | "urgent-high";

export interface GlucoseThresholds {
  urgentLow: number;   // default 55
  low: number;         // default 70
  high: number;        // default 180
  urgentHigh: number;  // default 260
}

export const DEFAULT_THRESHOLDS: GlucoseThresholds = {
  urgentLow: 55,
  low: 70,
  high: 180,
  urgentHigh: 260,
};

export type PredictiveAlarm = "predict-urgent-low" | "predict-low" | "predict-high" | "predict-urgent-high" | "none";

/**
 * Check if AR2 predicted values cross a threshold within the look-ahead window.
 * Matches Nightscout's predictive alarm logic — checks 3 steps (15 min) for urgent,
 * 6 steps (30 min) for warning.
 */
export function checkPredictiveAlarm(
  predicted: { mgdl: number; mills: number }[] | undefined,
  thresholds = DEFAULT_THRESHOLDS,
): PredictiveAlarm {
  if (!predicted?.length) return "none";
  const urgent = predicted.slice(0, 3);  // 15 min
  const warn   = predicted.slice(0, 6);  // 30 min

  if (urgent.some((p) => p.mgdl <= thresholds.urgentLow))  return "predict-urgent-low";
  if (urgent.some((p) => p.mgdl >= thresholds.urgentHigh)) return "predict-urgent-high";
  if (warn.some((p)  => p.mgdl < thresholds.low))          return "predict-low";
  if (warn.some((p)  => p.mgdl > thresholds.high))         return "predict-high";
  return "none";
}

export function getAlarmLevel(entry: Entry, thresholds = DEFAULT_THRESHOLDS): AlarmLevel {
  const sgv = entry.sgv;
  if (sgv === undefined) return "normal";
  if (sgv <= thresholds.urgentLow) return "urgent-low";
  if (sgv <= thresholds.low) return "low";
  if (sgv >= thresholds.urgentHigh) return "urgent-high";
  if (sgv >= thresholds.high) return "high";
  return "normal";
}

export const DIRECTION_ARROWS: Record<string, string> = {
  DoubleUp: "⇈",
  SingleUp: "↑",
  FortyFiveUp: "↗",
  Flat: "→",
  FortyFiveDown: "↘",
  SingleDown: "↓",
  DoubleDown: "⇊",
  NONE: "-",
};
