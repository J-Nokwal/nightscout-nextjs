import type { NextRequest } from "next/server";

/**
 * Parse a `since` timestamp from either:
 * - Path segment (Unix epoch ms or seconds)
 * - `Last-Modified` request header (HTTP date string)
 */
export function parseSince(raw: string | null | undefined): number | null {
  if (!raw) return null;

  // Numeric — ms or seconds
  const n = Number(raw);
  if (!isNaN(n) && n > 0) {
    // Nightscout sends seconds if < 10^10, ms if >= 10^10
    return n < 1e10 ? n * 1000 : n;
  }

  // HTTP date string (Last-Modified header)
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d.getTime();
}

/** Return value for the Last-Modified and ETag response headers */
export function maxTimestamp(timestamps: (number | string | undefined)[]): number {
  let max = 0;
  for (const t of timestamps) {
    if (!t) continue;
    const ms = typeof t === "number" ? t : new Date(t).getTime();
    if (!isNaN(ms) && ms > max) max = ms;
  }
  return max || Date.now();
}

export function sinceFromRequest(req: NextRequest, pathParam?: string): number | null {
  if (pathParam) return parseSince(pathParam);
  return parseSince(req.headers.get("last-modified"));
}
