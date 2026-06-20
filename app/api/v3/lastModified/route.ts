import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthorized } from "@/lib/nightscout/apiAuth";
import { withCors, corsOptions } from "@/lib/nightscout/cors";

export async function OPTIONS() { return corsOptions(); }

export async function GET(req: NextRequest) {
  if (!await isAuthorized(req)) {
    return withCors(NextResponse.json({ status: 401 }, { status: 401 }));
  }
  try {
    const result = await db.getLastModified();
    return withCors(NextResponse.json({ status: 200, result }));
  } catch {
    return withCors(NextResponse.json({ error: "Failed to get last modified" }, { status: 500 }));
  }
}
