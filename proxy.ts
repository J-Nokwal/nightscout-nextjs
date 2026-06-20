import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

// When AUTH_DEFAULT_ROLES=readable, unauthenticated users can view the dashboard.
// Write operations are still protected by individual route handlers.
const publicDashboard = process.env.AUTH_DEFAULT_ROLES === "readable";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn   = !!req.auth;

  // Always public: API routes, follow pages, clock views
  if (pathname.startsWith("/api/"))    return NextResponse.next();
  if (pathname.startsWith("/follow/")) return NextResponse.next();
  if (pathname.startsWith("/clock"))   return NextResponse.next();

  // In readable mode, dashboard routes are accessible without login
  if (publicDashboard && !pathname.startsWith("/login") && !pathname.startsWith("/register")) {
    // Redirect logged-in users away from /login /register as usual
    if (isLoggedIn && (pathname === "/login" || pathname === "/register")) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  // Default: require login for all app routes
  if (!isLoggedIn && !pathname.startsWith("/login") && !pathname.startsWith("/register")) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isLoggedIn && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
};
