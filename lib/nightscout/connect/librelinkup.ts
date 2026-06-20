import type { Entry } from "@/types/nightscout";

const REGION_URLS: Record<string, string> = {
  US: "api.libreview.io",
  EU: "api-eu.libreview.io",
  DE: "api-de.libreview.io",
  FR: "api-fr.libreview.io",
  JP: "api-jp.libreview.io",
  AP: "api-ap.libreview.io",
  AU: "api-au.libreview.io",
  AE: "api-ae.libreview.io",
};

const LLU_HEADERS = {
  "product":         "llu.android",
  "version":         "4.7.0",
  "Content-Type":    "application/json",
  "Accept-Encoding": "gzip",
};

// LLU trend IDs → Nightscout direction strings
const TREND_MAP: Record<number, string> = {
  1: "DoubleDown",
  2: "SingleDown",
  3: "FortyFiveDown",
  4: "Flat",
  5: "FortyFiveUp",
  6: "SingleUp",
  7: "DoubleUp",
};

// Module-level cache — reset on each cold start (e.g. serverless function)
let cachedToken: { token: string; expiry: number } | null = null;
let cachedPatientId: string | null = null;

function baseUrl(region: string): string {
  const host = REGION_URLS[region.toUpperCase()] ?? REGION_URLS.EU;
  return `https://${host}/llu`;
}

async function authenticate(email: string, password: string, region: string): Promise<string> {
  if (cachedToken && cachedToken.expiry > Date.now()) return cachedToken.token;

  const res = await fetch(`${baseUrl(region)}/auth/login`, {
    method: "POST",
    headers: LLU_HEADERS,
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`LibreLinkUp auth failed: ${res.status}`);

  const data = await res.json() as {
    status: number;
    data?: { authTicket?: { token: string; duration?: number } };
  };
  if (data.status !== 0 || !data.data?.authTicket?.token) {
    throw new Error("LibreLinkUp auth: invalid credentials or response");
  }

  const token    = data.data.authTicket.token;
  const duration = (data.data.authTicket.duration ?? 3600) * 1000;
  cachedToken    = { token, expiry: Date.now() + duration - 60_000 };
  return token;
}

async function resolvePatientId(token: string, region: string, explicit?: string | null): Promise<string> {
  if (explicit) return explicit;
  if (cachedPatientId) return cachedPatientId;

  const res = await fetch(`${baseUrl(region)}/connections`, {
    headers: { ...LLU_HEADERS, "Authorization": `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`LibreLinkUp connections failed: ${res.status}`);

  const data = await res.json() as { data?: { patientId: string }[] };
  const pid   = data.data?.[0]?.patientId;
  if (!pid) throw new Error("LibreLinkUp: no connected patients found");
  cachedPatientId = pid;
  return pid;
}

export async function fetchLibreLinkUp(opts: {
  username:   string;
  password:   string;
  region:     string;
  patientId?: string | null;
  maxCount?:  number;
}): Promise<Entry[]> {
  const { username, password, region, patientId, maxCount = 288 } = opts;
  const token = await authenticate(username, password, region);
  const pid   = await resolvePatientId(token, region, patientId);

  const res = await fetch(`${baseUrl(region)}/connections/${pid}/graph`, {
    headers: { ...LLU_HEADERS, "Authorization": `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`LibreLinkUp graph failed: ${res.status}`);

  const body = await res.json() as {
    data?: {
      graphData?: {
        FactoryTimestamp: string;
        Value: number;
        TrendArrow?: number;
      }[];
    };
  };

  return (body.data?.graphData ?? []).slice(-maxCount).map((p) => {
    const date = new Date(p.FactoryTimestamp).getTime();
    return {
      date,
      dateString: new Date(date).toISOString(),
      type:       "sgv" as const,
      sgv:        Math.round(p.Value * 18.01559), // mmol/L → mg/dL
      direction:  (TREND_MAP[p.TrendArrow ?? 4] ?? "Flat") as Entry["direction"],
      device:     "LibreLinkUp",
    };
  });
}
