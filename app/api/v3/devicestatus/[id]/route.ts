import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAdmin, isAuthorized } from "@/lib/nightscout/apiAuth";
import { withCors, corsOptions } from "@/lib/nightscout/cors";

export async function OPTIONS() { return corsOptions(); }

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!await isAuthorized(req)) {
    return withCors(NextResponse.json({ status: 401 }, { status: 401 }));
  }
  const { id } = await ctx.params;
  try {
    const status = await db.getDeviceStatusById(id);
    if (!status) return withCors(NextResponse.json({ status: 404 }, { status: 404 }));
    return withCors(NextResponse.json({ status: 200, result: status }));
  } catch {
    return withCors(NextResponse.json({ error: "Failed to fetch device status" }, { status: 500 }));
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!await isAdmin(req)) {
    return withCors(NextResponse.json({ status: 401 }, { status: 401 }));
  }
  const { id } = await ctx.params;
  try {
    await db.deleteDeviceStatus(id);
    return withCors(NextResponse.json({ status: 200 }));
  } catch {
    return withCors(NextResponse.json({ error: "Failed to delete device status" }, { status: 500 }));
  }
}
