// COB — Linear carb absorption model matching Nightscout's cob plugin.

import type { Treatment } from "@/types/nightscout";

export interface COBResult {
  cob: number;       // grams of carbs still active
  carbs: number;     // total carbs entered in window
}

export function calcCOB(
  treatments: Treatment[],
  carbsPerHour = 20,  // default absorption rate (g/hr)
  now = Date.now()
): COBResult {
  let cob = 0;
  let carbs = 0;

  for (const t of treatments) {
    if (!t.carbs || t.carbs <= 0) continue;
    const tMills = t.timestamp ?? new Date(t.created_at).getTime();
    const minsAgo = (now - tMills) / 60000;
    if (minsAgo < 0) continue;

    carbs += t.carbs;

    // Linear absorption: all carbs consumed after (carbs / (carbsPerHour/60)) minutes
    const absorptionMins = (t.carbs / carbsPerHour) * 60;
    if (minsAgo >= absorptionMins) continue;

    const remaining = t.carbs * (1 - minsAgo / absorptionMins);
    cob += remaining;
  }

  return { cob: Math.max(0, cob), carbs };
}
