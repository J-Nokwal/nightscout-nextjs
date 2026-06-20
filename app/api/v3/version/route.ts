import { NextResponse } from "next/server";
import { withCors, corsOptions } from "@/lib/nightscout/cors";

export async function OPTIONS() { return corsOptions(); }

export async function GET() {
  return withCors(NextResponse.json({
    status: 200,
    result: {
      version:    "0.1.0",
      apiVersion: "3.0.4",
      srvDate:    Date.now(),
      storage: {
        type:    process.env.DB_ADAPTER ?? "mongo",
        version: "latest",
      },
    },
  }));
}
