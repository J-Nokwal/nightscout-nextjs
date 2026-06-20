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
  const dateFrom = Date.now() - days * 24 * 60 * 60 * 1000;

  const all = await db.getTreatments({ count: days * 50, find: {} }).catch(() => []);
  const treatments = all
    .filter((t) => new Date(t.created_at).getTime() >= dateFrom)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  if (fmt === "csv") {
    const header = "date,eventType,insulin,carbs,glucose,duration,notes,enteredBy";
    const rows = treatments.map((t) =>
      [
        t.created_at,
        `"${t.eventType}"`,
        t.insulin ?? "",
        t.carbs ?? "",
        t.glucose ?? "",
        t.duration ?? "",
        `"${(t.notes ?? "").replace(/"/g, '""')}"`,
        `"${(t.enteredBy ?? "").replace(/"/g, '""')}"`,
      ].join(",")
    );
    return new NextResponse([header, ...rows].join("\n"), {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="nightscout-treatments-${days}d.csv"`,
      },
    });
  }

  return new NextResponse(JSON.stringify(treatments, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="nightscout-treatments-${days}d.json"`,
    },
  });
}
