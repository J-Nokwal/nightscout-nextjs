import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAdmin, isAuthorized } from "@/lib/nightscout/apiAuth";
import { withCors, corsOptions } from "@/lib/nightscout/cors";
import type { Treatment } from "@/types/nightscout";

export async function OPTIONS() { return corsOptions(); }

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!await isAuthorized(req)) {
    return withCors(NextResponse.json({ status: 401 }, { status: 401 }));
  }
  const { id } = await ctx.params;
  try {
    const treatment = await db.getTreatmentById(id);
    if (!treatment) return withCors(NextResponse.json({ status: 404 }, { status: 404 }));
    return withCors(NextResponse.json({ status: 200, result: treatment }));
  } catch {
    return withCors(NextResponse.json({ error: "Failed to fetch treatment" }, { status: 500 }));
  }
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!await isAdmin(req)) return withCors(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  const { id } = await ctx.params;
  try {
    const body: Partial<Treatment> = await req.json();
    const updated = await db.updateTreatment(id, body);
    return withCors(NextResponse.json(updated));
  } catch {
    return withCors(NextResponse.json({ error: "Failed to update" }, { status: 500 }));
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!await isAdmin(req)) return withCors(NextResponse.json({ status: 401 }, { status: 401 }));
  const { id } = await ctx.params;
  try {
    const body: Partial<Treatment> = await req.json();
    const updated = await db.updateTreatment(id, body);
    return withCors(NextResponse.json({ status: 200, result: updated }));
  } catch {
    return withCors(NextResponse.json({ error: "Failed to patch treatment" }, { status: 500 }));
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!await isAdmin(req)) return withCors(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  const { id } = await ctx.params;
  try {
    await db.deleteTreatment(id);
    return withCors(new NextResponse(null, { status: 204 }));
  } catch {
    return withCors(NextResponse.json({ error: "Failed to delete" }, { status: 500 }));
  }
}
