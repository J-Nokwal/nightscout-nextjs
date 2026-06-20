import { NextRequest, NextResponse } from "next/server";
import { searchFoods } from "@/lib/nightscout/foodDb";
import { withCors, corsOptions } from "@/lib/nightscout/cors";

export async function OPTIONS() { return corsOptions(); }

export async function GET(req: NextRequest) {
  const q     = req.nextUrl.searchParams.get("q") ?? "";
  const limit = Number(req.nextUrl.searchParams.get("limit") ?? 10);
  const results = searchFoods(q, Math.min(limit, 50));
  return withCors(NextResponse.json(results));
}
