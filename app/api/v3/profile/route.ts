import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAdmin, isAuthorized } from "@/lib/nightscout/apiAuth";
import { withCors, corsOptions } from "@/lib/nightscout/cors";
import type { Profile } from "@/types/nightscout";

export async function OPTIONS() { return corsOptions(); }

export async function GET(req: NextRequest) {
  if (!await isAuthorized(req)) {
    return withCors(NextResponse.json({ status: 401 }, { status: 401 }));
  }
  try {
    const profiles = await db.getProfiles();
    return withCors(NextResponse.json({ status: 200, result: profiles }));
  } catch {
    return withCors(NextResponse.json({ error: "Failed to fetch profiles" }, { status: 500 }));
  }
}

export async function POST(req: NextRequest) {
  if (!await isAdmin(req)) {
    return withCors(NextResponse.json({ status: 401 }, { status: 401 }));
  }
  try {
    const body: Profile = await req.json();
    const created = await db.createProfile(body);
    const location = `/api/v3/profile/${created._id}`;
    return withCors(
      NextResponse.json({ status: 201, identifier: created._id }, { status: 201, headers: { Location: location } })
    );
  } catch {
    return withCors(NextResponse.json({ error: "Failed to create profile" }, { status: 500 }));
  }
}
