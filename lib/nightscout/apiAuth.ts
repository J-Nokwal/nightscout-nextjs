import { createHash } from "crypto";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

/** True if request carries a valid API secret header OR any valid session (admin or readable). */
export async function isAuthorized(req: NextRequest): Promise<boolean> {
  if (verifyApiSecret(req)) return true;
  const session = await auth();
  return !!session?.user;
}

/** True if request carries a valid API secret header OR an admin-role session.
 *  Use this for write operations — readable sessions are rejected. */
export async function isAdmin(req: NextRequest): Promise<boolean> {
  // API secret always grants full access (device uploaders)
  if (verifyApiSecret(req)) return true;
  const session = await auth();
  return session?.user?.role === "admin";
}

/** Synchronous check for API secret only (use in Edge-compatible contexts).
 *  Accepts: Authorization header, API-SECRET header, ?token= or ?api_secret= query param.
 *  Values accepted: plain secret OR sha1(secret) hash (as older uploaders send). */
export function verifyApiSecret(req: NextRequest): boolean {
  const secret = process.env.API_SECRET;
  if (!secret) return false;
  const expectedHash = createHash("sha1").update(secret).digest("hex");

  // Check headers (Authorization or API-SECRET)
  const headerVal = req.headers.get("authorization") ?? req.headers.get("api-secret");
  if (headerVal) {
    if (headerVal === secret || headerVal === expectedHash) return true;
  }

  // Check query params: ?token=<hash> or ?api_secret=<hash>  (used by xDrip+, older uploaders)
  const sp = req.nextUrl.searchParams;
  const tokenParam = sp.get("token") ?? sp.get("api_secret");
  if (tokenParam) {
    if (tokenParam === secret || tokenParam === expectedHash) return true;
  }

  return false;
}
