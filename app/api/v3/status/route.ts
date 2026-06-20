import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { verifyApiSecret } from "@/lib/nightscout/apiAuth";
import { withCors, corsOptions } from "@/lib/nightscout/cors";

export async function OPTIONS() { return corsOptions(); }

export async function GET(req: NextRequest) {
  const isApiSecret = verifyApiSecret(req);
  const session     = isApiSecret ? null : await auth();

  if (!isApiSecret && !session?.user) {
    return withCors(NextResponse.json({ status: 401 }, { status: 401 }));
  }

  const isAdminUser = isApiSecret || session?.user?.role === "admin";
  const perms       = isAdminUser ? "crud" : "r";

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
      apiPermissions: {
        devicestatus: perms,
        entries:      perms,
        food:         perms,
        profile:      perms,
        treatments:   perms,
      },
    },
  }));
}
