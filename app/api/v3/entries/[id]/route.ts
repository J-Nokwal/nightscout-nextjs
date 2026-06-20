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
    const entry = await db.getEntryById(id);
    if (!entry) return withCors(NextResponse.json({ status: 404 }, { status: 404 }));
    return withCors(NextResponse.json({ status: 200, result: entry }));
  } catch {
    return withCors(NextResponse.json({ error: "Failed to fetch entry" }, { status: 500 }));
  }
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!await isAdmin(req)) {
    return withCors(NextResponse.json({ status: 401 }, { status: 401 }));
  }
  const { id } = await ctx.params;
  try {
    const body = await req.json() as Record<string, unknown>;
    const { _id, ...update } = body;
    void _id;
    const updated = await db.updateEntry(id, update);
    if (!updated) return withCors(NextResponse.json({ status: 404 }, { status: 404 }));
    return withCors(NextResponse.json({ status: 200, result: updated }));
  } catch {
    return withCors(NextResponse.json({ error: "Failed to update entry" }, { status: 500 }));
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!await isAdmin(req)) {
    return withCors(NextResponse.json({ status: 401 }, { status: 401 }));
  }
  const { id } = await ctx.params;
  try {
    await db.deleteEntry(id);
    return withCors(NextResponse.json({ status: 200 }));
  } catch {
    return withCors(NextResponse.json({ error: "Failed to delete entry" }, { status: 500 }));
  }
}
