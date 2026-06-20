import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAdmin } from "@/lib/nightscout/apiAuth";
import { withCors, corsOptions } from "@/lib/nightscout/cors";
import { broadcast } from "@/lib/sse/broadcaster";
import type { DeviceStatus } from "@/types/nightscout";

export async function OPTIONS() { return corsOptions(); }

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const count = Number(searchParams.get("count") ?? 1);

  try {
    const statuses = await db.getDeviceStatuses({ count });
    return withCors(NextResponse.json(statuses));
  } catch {
    return withCors(NextResponse.json({ error: "Failed to fetch device status" }, { status: 500 }));
  }
}

export async function POST(req: NextRequest) {
  if (!await isAdmin(req)) {
    return withCors(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }

  try {
    const body: DeviceStatus = await req.json();
    const created = await db.createDeviceStatus(body);
    broadcast("devicestatus", { count: 1 });
    return withCors(NextResponse.json(created, { status: 201 }));
  } catch {
    return withCors(NextResponse.json({ error: "Failed to create device status" }, { status: 500 }));
  }
}
