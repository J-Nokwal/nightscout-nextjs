import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAdmin, isAuthorized } from "@/lib/nightscout/apiAuth";
import { withCors, corsOptions } from "@/lib/nightscout/cors";

export async function OPTIONS() { return corsOptions(); }

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!await isAuthorized(req)) {
    return withCors(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }
  const { id } = await ctx.params;
  const activity = await db.getActivityById(id).catch(() => null);
  if (!activity) return withCors(NextResponse.json({ error: "Not found" }, { status: 404 }));
  return withCors(NextResponse.json({ status: 200, result: activity }));
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!await isAdmin(req)) {
    return withCors(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }
  const { id } = await ctx.params;
  await db.deleteActivity(id).catch(() => null);
  return withCors(new NextResponse(null, { status: 204 }));
}
