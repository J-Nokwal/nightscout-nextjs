import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAdmin } from "@/lib/nightscout/apiAuth";
import { withCors, corsOptions } from "@/lib/nightscout/cors";
import { broadcast } from "@/lib/sse/broadcaster";
import type { Entry } from "@/types/nightscout";

export async function OPTIONS() { return corsOptions(); }

// Parse Nightscout's find[field][$op]=value query syntax used by xDrip+ / AAPS
function parseFindParams(searchParams: URLSearchParams): {
  dateFrom?: number; dateTo?: number; find: Record<string, unknown>;
} {
  let dateFrom: number | undefined;
  let dateTo:   number | undefined;
  const find: Record<string, unknown> = {};

  // ?find[date][$gte]=<ms> / ?find[date][$lte]=<ms>
  const dateGte = searchParams.get("find[date][$gte]");
  const dateLte = searchParams.get("find[date][$lte]");
  if (dateGte) dateFrom = Number(dateGte);
  if (dateLte) dateTo   = Number(dateLte);

  // ?dateFrom=<ms> / ?dateTo=<ms>  (our own format)
  const dfParam = searchParams.get("dateFrom");
  const dtParam = searchParams.get("dateTo");
  if (dfParam) dateFrom = Number(dfParam);
  if (dtParam) dateTo   = Number(dtParam);

  // ?type=sgv  or  ?find[type][$eq]=sgv
  const typeParam  = searchParams.get("type") ?? searchParams.get("find[type][$eq]");
  if (typeParam) find.type = typeParam;

  return { dateFrom, dateTo, find };
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const count = Number(searchParams.get("count") ?? searchParams.get("limit") ?? 10);
  const { dateFrom, dateTo, find } = parseFindParams(searchParams);

  try {
    const entries = await db.getEntries({ count, dateFrom, dateTo, find: find as Partial<import("@/types/nightscout").Entry> });
    return withCors(NextResponse.json(entries));
  } catch {
    return withCors(NextResponse.json({ error: "Failed to fetch entries" }, { status: 500 }));
  }
}

export async function POST(req: NextRequest) {
  if (!await isAdmin(req)) {
    return withCors(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }

  try {
    const body = await req.json();
    const entries: Entry[] = Array.isArray(body) ? body : [body];
    const created = await db.createEntries(entries);
    broadcast("entries", { count: created.length });
    return withCors(NextResponse.json(created, { status: 201 }));
  } catch {
    return withCors(NextResponse.json({ error: "Failed to create entries" }, { status: 500 }));
  }
}
