/** Returns a human-readable "X min ago" / "X h ago" string. */
export function timeAgo(mills: number, now = Date.now()): string {
  const diffMs = now - mills;
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ${diffMins % 60}m ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

/** >15 min without a reading is considered stale (matches Nightscout default). */
export function isStale(mills: number, now = Date.now(), thresholdMs = 15 * 60 * 1000): boolean {
  return now - mills > thresholdMs;
}
