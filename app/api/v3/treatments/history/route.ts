import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthorized } from "@/lib/nightscout/apiAuth";
import { withCors, corsOptions } from "@/lib/nightscout/cors";
import { sinceFromRequest, maxTimestamp } from "@/lib/nightscout/historyHelper";

export async function OPTIONS() { return corsOptions(); }

export async function GET(req: NextRequest) {
  if (!await isAuthorized(req)) {
    return withCors(NextResponse.json({ status: 401 }, { status: 401 }));
  }
  const since = sinceFromRequest(req);
  if (since === null) {
    return withCors(NextResponse.json({ status: 400, message: "Last-Modified header required" }, { status: 400 }));
  }
  const limit = Number(req.nextUrl.searchParams.get("limit") ?? 1000);
  try {
    const treatments = await db.getTreatments({ count: limit, dateFrom: since });
    const maxTs      = maxTimestamp(treatments.map((t) => t.created_at));
    const lm         = new Date(maxTs).toUTCString();
    return withCors(
      NextResponse.json({ status: 200, result: treatments }, {
        headers: { "Last-Modified": lm, "ETag": `W/"${maxTs}"` },
      })
    );
  } catch {
    return withCors(NextResponse.json({ error: "Failed" }, { status: 500 }));
  }
}
