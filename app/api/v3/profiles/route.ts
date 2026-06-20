import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAdmin } from "@/lib/nightscout/apiAuth";
import { withCors, corsOptions } from "@/lib/nightscout/cors";
import type { Profile } from "@/types/nightscout";

export async function OPTIONS() { return corsOptions(); }

export async function GET() {
  try {
    const profiles = await db.getProfiles();
    return withCors(NextResponse.json(profiles));
  } catch {
    return withCors(NextResponse.json({ error: "Failed to fetch profiles" }, { status: 500 }));
  }
}

export async function POST(req: NextRequest) {
  if (!await isAdmin(req)) {
    return withCors(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }
  try {
    const body: Profile = await req.json();
    const created = await db.createProfile(body);
    return withCors(NextResponse.json(created, { status: 201 }));
  } catch {
    return withCors(NextResponse.json({ error: "Failed to create profile" }, { status: 500 }));
  }
}
