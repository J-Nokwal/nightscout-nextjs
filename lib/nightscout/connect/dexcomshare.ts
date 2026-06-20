import type { Entry } from "@/types/nightscout";

const US_URL  = "https://share2.dexcom.com";
const OUS_URL = "https://shareous1.dexcom.com";
const APP_ID  = "d8665ade-9673-4e27-9ff6-92db4ce13d13";

// Dexcom Share trend codes → Nightscout direction strings
const DIRECTION_MAP: Record<number, string> = {
  0: "NONE",
  1: "DoubleUp",
  2: "SingleUp",
  3: "FortyFiveUp",
  4: "Flat",
  5: "FortyFiveDown",
  6: "SingleDown",
  7: "DoubleDown",
  8: "NONE",
};

let cachedSession: { id: string; expiry: number } | null = null;

function baseUrl(region: string): string {
  return region.toLowerCase() === "ous" ? OUS_URL : US_URL;
}

async function getSessionId(accountName: string, password: string, region: string): Promise<string> {
  if (cachedSession && cachedSession.expiry > Date.now()) return cachedSession.id;

  const url = `${baseUrl(region)}/ShareWebServices/Services/General/LoginPublisherAccountByName`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accountName, password, applicationId: APP_ID }),
  });
  if (!res.ok) throw new Error(`Dexcom Share login failed: ${res.status}`);

  const id = await res.json() as string;
  if (!id || id === "00000000-0000-0000-0000-000000000000") {
    throw new Error("Dexcom Share: invalid credentials");
  }

  // Sessions last ~5 hours; cache for 4
  cachedSession = { id, expiry: Date.now() + 4 * 3_600_000 };
  return id;
}

export async function fetchDexcomShare(opts: {
  accountName: string;
  password:    string;
  region:      string;
  minutes?:    number;
  maxCount?:   number;
  _retried?:   boolean;
}): Promise<Entry[]> {
  const { accountName, password, region, minutes = 1440, maxCount = 288, _retried = false } = opts;
  const sessionId = await getSessionId(accountName, password, region);

  const params = new URLSearchParams({
    sessionId,
    minutes:  String(minutes),
    maxCount: String(maxCount),
  });
  const url = `${baseUrl(region)}/ShareWebServices/Services/Publisher/ReadPublisherLatestGlucoseValues?${params}`;
  const res = await fetch(url);

  // 500 usually means expired session — evict cache and retry once
  if (res.status === 500 && !_retried) {
    cachedSession = null;
    return fetchDexcomShare({ ...opts, _retried: true });
  }
  if (!res.ok) throw new Error(`Dexcom Share data fetch failed: ${res.status}`);

  const readings = await res.json() as {
    WT:    string;   // "/Date(1234567890000)/"
    Value: number;
    Trend: number;
  }[];

  return readings.map((r) => {
    const ms = parseInt(r.WT.replace(/\D/g, ""), 10);
    return {
      date:       ms,
      dateString: new Date(ms).toISOString(),
      type:       "sgv" as const,
      sgv:        r.Value,
      direction:  (DIRECTION_MAP[r.Trend] ?? "Flat") as Entry["direction"],
      device:     "DexcomShare",
    };
  });
}
