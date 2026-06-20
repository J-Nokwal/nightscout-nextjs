export function mgdlToMmol(mgdl: number): number {
  return Math.round((mgdl / 18.01559) * 10) / 10;
}

export function mmolToMgdl(mmol: number): number {
  return Math.round(mmol * 18.01559);
}

export type GlucoseUnit = "mg/dl" | "mmol";

export function formatGlucose(mgdl: number, unit: GlucoseUnit): string {
  if (unit === "mmol") return mgdlToMmol(mgdl).toFixed(1);
  return String(mgdl);
}
