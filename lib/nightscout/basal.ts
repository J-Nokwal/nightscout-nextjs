import type { Treatment, ProfileStore } from "@/types/nightscout";

export interface BasalPoint {
  mills: number;
  rate:   number;   // U/hr
  isTemp: boolean;
}

/**
 * Build a 5-min-step basal rate timeline for the given window,
 * merging the profile's scheduled basal with any Temp Basal treatments.
 * Matches Nightscout's basal rendering logic.
 */
export function buildBasalTimeline(
  profile: ProfileStore | undefined,
  treatments: Treatment[],
  fromMills: number,
  toMills: number,
): BasalPoint[] {
  if (!profile?.basal?.length) return [];

  const schedule = [...profile.basal].sort((a, b) => a.timeAsSeconds - b.timeAsSeconds);

  const tempBasals = treatments
    .filter((t) => t.eventType === "Temp Basal" && t.duration != null && t.absolute != null)
    .map((t) => {
      const start = t.timestamp ?? new Date(t.created_at).getTime();
      return { start, end: start + t.duration! * 60_000, rate: t.absolute! };
    });

  const STEP = 5 * 60_000;
  const points: BasalPoint[] = [];

  for (let m = fromMills; m <= toMills; m += STEP) {
    const temp = tempBasals.find((tb) => m >= tb.start && m < tb.end);
    if (temp) {
      points.push({ mills: m, rate: temp.rate, isTemp: true });
      continue;
    }

    const date = new Date(m);
    const secs = date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();
    let rate = schedule[0].value;
    for (const s of schedule) {
      if (s.timeAsSeconds <= secs) rate = s.value;
    }
    points.push({ mills: m, rate, isTemp: false });
  }

  return points;
}
