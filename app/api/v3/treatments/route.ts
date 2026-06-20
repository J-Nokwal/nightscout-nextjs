import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAdmin } from "@/lib/nightscout/apiAuth";
import { withCors, corsOptions } from "@/lib/nightscout/cors";
import { broadcast } from "@/lib/sse/broadcaster";
import type { Treatment } from "@/types/nightscout";

export async function OPTIONS() { return corsOptions(); }

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const count     = Number(searchParams.get("count") ?? 10);
  const skip      = Number(searchParams.get("skip")  ?? 0);
  const eventType = searchParams.get("eventType");

  const find: Partial<Treatment> = {};
  if (eventType) find.eventType = eventType as Treatment["eventType"];

  try {
    const treatments = await db.getTreatments({ count, skip, find });
    return withCors(NextResponse.json(treatments));
  } catch {
    return withCors(NextResponse.json({ error: "Failed to fetch treatments" }, { status: 500 }));
  }
}

export async function POST(req: NextRequest) {
  if (!await isAdmin(req)) {
    return withCors(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }

  try {
    const body: Treatment = await req.json();
    const created = await db.createTreatment(body);
    broadcast("treatments", { count: 1 });
    return withCors(NextResponse.json(created, { status: 201 }));
  } catch {
    return withCors(NextResponse.json({ error: "Failed to create treatment" }, { status: 500 }));
  }
}
