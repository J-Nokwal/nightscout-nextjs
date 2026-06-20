import type { Treatment } from "@/types/nightscout";

export interface AgeResult {
  hours: number;
  display: string; // e.g. "2d 4h"
}

function hoursToDisplay(hours: number): string {
  const d = Math.floor(hours / 24);
  const h = Math.floor(hours % 24);
  if (d === 0) return `${h}h`;
  return `${d}d ${h}h`;
}

function lastEvent(treatments: Treatment[], eventType: string, now: number): AgeResult | null {
  const matches = treatments
    .filter((t) => t.eventType === eventType)
    .sort((a, b) => {
      const aT = a.timestamp ?? new Date(a.created_at).getTime();
      const bT = b.timestamp ?? new Date(b.created_at).getTime();
      return bT - aT;
    });

  if (!matches[0]) return null;
  const t = matches[0];
  const mills = t.timestamp ?? new Date(t.created_at).getTime();
  const hours = (now - mills) / 3_600_000;
  return { hours, display: hoursToDisplay(hours) };
}

export function calcSAGE(treatments: Treatment[], now = Date.now()) {
  return lastEvent(treatments, "Sensor Start", now) ?? lastEvent(treatments, "Sensor Change", now);
}
export function calcCAGE(treatments: Treatment[], now = Date.now()) {
  return lastEvent(treatments, "Site Change", now);
}
export function calcIAGE(treatments: Treatment[], now = Date.now()) {
  return lastEvent(treatments, "Insulin Change", now);
}
export function calcBAGE(treatments: Treatment[], now = Date.now()) {
  return lastEvent(treatments, "Pump Battery Change", now);
}
