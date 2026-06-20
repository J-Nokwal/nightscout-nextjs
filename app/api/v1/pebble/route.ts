import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withCors, corsOptions } from "@/lib/nightscout/cors";
import { isAuthorized } from "@/lib/nightscout/apiAuth";

export async function OPTIONS() { return corsOptions(); }

// /api/v1/pebble — compatible with xDrip+, Garmin Connect IQ, Pebble watchfaces, and other NS integrations.
// Supports ?units=mgdl|mmol query param to override server unit.
export async function GET(req: NextRequest) {
  if (!await isAuthorized(req)) {
    return withCors(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }

  const sp          = req.nextUrl.searchParams;
  const unitParam   = sp.get("units")?.toLowerCase();
  const serverUnits = (process.env.DISPLAY_UNITS ?? "mg/dl").toLowerCase();
  // Resolve output unit: query param overrides server config
  const wantMgdl    = unitParam === "mgdl" || unitParam === "mg/dl"
    || (!unitParam && (serverUnits === "mg/dl" || serverUnits === "mg"));
  const wantMmol    = !wantMgdl;

  function convert(v: number): number {
    return wantMmol ? Math.round((v / 18.01559) * 10) / 10 : Math.round(v);
  }

  try {
    const entries = await db.getEntries({ count: 2 });
    const latest  = entries[0];
    const prev    = entries[1];

    if (!latest) {
      return withCors(NextResponse.json({ status: "No data" }, { status: 200 }));
    }

    const sgv      = latest.sgv ?? 0;
    const sgvPrev  = prev?.sgv ?? sgv;
    const bgDisplay = convert(sgv);
    const delta     = convert(sgv - sgvPrev);
    const ageMs     = Date.now() - latest.date;

    return withCors(NextResponse.json({
      status:  "ok",
      bgs: [{
        sgv:       String(bgDisplay),
        bgdelta:   delta,
        trend:     arrowToTrendNum(latest.direction),
        direction: latest.direction ?? "Flat",
        datetime:  latest.date,
        filtered:  undefined,
        unfiltered: undefined,
        noise:     latest.noise ?? 1,
        rssi:      100,
      }],
      cals:    [],
      mbgs:    [],
      // Age of last reading in minutes
      ageMs,
      units:   wantMmol ? "mmol" : "mg/dl",
    }));
  } catch {
    return withCors(NextResponse.json({ error: "Internal error" }, { status: 500 }));
  }
}

function arrowToTrendNum(direction?: string): number {
  const map: Record<string, number> = {
    DoubleUp:      1,
    SingleUp:      2,
    FortyFiveUp:   3,
    Flat:          4,
    FortyFiveDown: 5,
    SingleDown:    6,
    DoubleDown:    7,
    NONE:          0,
  };
  return map[direction ?? "Flat"] ?? 4;
}
