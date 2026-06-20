import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthorized } from "@/lib/nightscout/apiAuth";

export async function GET(req: NextRequest) {
  if (!await isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const fmt      = searchParams.get("format") ?? "json";
  const days     = Number(searchParams.get("days") ?? 30);
  const dateTo   = Date.now();
  const dateFrom = dateTo - days * 24 * 60 * 60 * 1000;
  const count    = days * 288 + 50;

  const entries = await db.getEntries({ count, dateFrom, dateTo }).catch(() => []);
  const sorted  = [...entries].sort((a, b) => a.date - b.date);

  if (fmt === "csv") {
    const rows = [
      "date,sgv,direction,device",
      ...sorted.map((e) =>
        [
          new Date(e.date).toISOString(),
          e.sgv ?? "",
          e.direction ?? "",
          e.device ?? "",
        ].join(",")
      ),
    ].join("\n");

    return new NextResponse(rows, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="nightscout-entries-${days}d.csv"`,
      },
    });
  }

  return new NextResponse(JSON.stringify(sorted, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="nightscout-entries-${days}d.json"`,
    },
  });
}
