import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAdmin, isAuthorized } from "@/lib/nightscout/apiAuth";
import { withCors, corsOptions } from "@/lib/nightscout/cors";
import type { Activity } from "@/types/nightscout";

export async function OPTIONS() { return corsOptions(); }

export async function GET(req: NextRequest) {
  if (!await isAuthorized(req)) {
    return withCors(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }
  const { searchParams } = req.nextUrl;
  const count    = Number(searchParams.get("count") ?? 10);
  const dateFrom = searchParams.get("dateFrom") ? Number(searchParams.get("dateFrom")) : undefined;
  try {
    const activities = await db.getActivities({ count, dateFrom });
    return withCors(NextResponse.json(activities));
  } catch {
    return withCors(NextResponse.json({ error: "Failed to fetch activity" }, { status: 500 }));
  }
}

export async function POST(req: NextRequest) {
  if (!await isAdmin(req)) {
    return withCors(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }
  try {
    const body: Activity = await req.json();
    if (!body.created_at) body.created_at = new Date().toISOString();
    const created = await db.createActivity(body);
    return withCors(NextResponse.json(created, { status: 201 }));
  } catch {
    return withCors(NextResponse.json({ error: "Failed to create activity" }, { status: 500 }));
  }
}
