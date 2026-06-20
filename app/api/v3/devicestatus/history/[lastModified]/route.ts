import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthorized } from "@/lib/nightscout/apiAuth";
import { withCors, corsOptions } from "@/lib/nightscout/cors";
import { sinceFromRequest, maxTimestamp } from "@/lib/nightscout/historyHelper";

export async function OPTIONS() { return corsOptions(); }

export async function GET(req: NextRequest, ctx: { params: Promise<{ lastModified: string }> }) {
  if (!await isAuthorized(req)) {
    return withCors(NextResponse.json({ status: 401 }, { status: 401 }));
  }
  const { lastModified } = await ctx.params;
  const since = sinceFromRequest(req, lastModified);
  if (since === null) {
    return withCors(NextResponse.json({ status: 400 }, { status: 400 }));
  }
  const limit = Number(req.nextUrl.searchParams.get("limit") ?? 1000);
  try {
    const statuses = await db.getDeviceStatuses({ count: limit, dateFrom: since });
    const maxTs    = maxTimestamp(statuses.map((s) => s.created_at));
    const lm       = new Date(maxTs).toUTCString();
    return withCors(
      NextResponse.json({ status: 200, result: statuses }, {
        headers: { "Last-Modified": lm, "ETag": `W/"${maxTs}"` },
      })
    );
  } catch {
    return withCors(NextResponse.json({ error: "Failed" }, { status: 500 }));
  }
}
