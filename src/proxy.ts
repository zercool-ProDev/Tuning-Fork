import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

/**
 * Gate every page and API route behind the session cookie, except the login
 * flow itself. Denying by default means a new route is protected the moment it
 * is created, rather than the moment someone remembers to guard it.
 */
/**
 * `/api/health` is public on purpose: it reports only whether the database is
 * reachable, never any of your data, and it is the one endpoint worth being
 * able to check without first being able to log in. Diagnostic detail in its
 * response is still gated on the session — see the route.
 */
const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/health"];

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  const secret = process.env.AUTH_SECRET;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const signedIn = Boolean(secret) && (await verifySessionToken(token, secret!));

  if (signedIn && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (isPublic || signedIn) {
    return NextResponse.next();
  }

  // API callers get a status they can act on; page requests get sent to login.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  if (pathname !== "/") {
    loginUrl.searchParams.set("next", pathname);
  }
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Everything except Next internals and static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
