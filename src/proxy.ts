// Next 16 proxy (formerly middleware): mounts the Auth0 routes (/auth/login, /auth/callback,
// /auth/logout, /auth/profile, ...) and gates the signed-in pages. /intake stays public;
// API routes check the session themselves with requireSession().
import { NextResponse, type NextRequest } from "next/server";
import { auth0 } from "@/lib/auth0";
import { authBypassed } from "@/lib/server/auth";

const PROTECTED_PAGES = ["/snapshot", "/plan", "/banker"];
const RETURN_TO_AFTER_LOGIN = "/snapshot";

const isUnder = (pathname: string, base: string) => pathname === base || pathname.startsWith(`${base}/`);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const protectedPage = PROTECTED_PAGES.some((p) => isUnder(pathname, p));
  if (authBypassed() && !pathname.startsWith("/auth")) {
    // Emergency demo switch (#39): no login redirect; requireSession() returns a demo session.
    // Auth0 is skipped entirely here, so a missing or broken Auth0 config can't 500 every page (#97).
    if (protectedPage || isUnder(pathname, "/api")) console.log(`[auth bypass] ${request.method} ${pathname}`);
    return NextResponse.next();
  }

  const authResponse = await auth0.middleware(request);
  if (pathname.startsWith("/auth")) return authResponse;

  if (protectedPage) {
    const session = await auth0.getSession(request);
    if (!session) {
      const login = new URL("/auth/login", request.nextUrl.origin);
      login.searchParams.set("returnTo", isUnder(pathname, "/banker") ? "/banker" : RETURN_TO_AFTER_LOGIN);
      return NextResponse.redirect(login);
    }
  }
  return authResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)"],
};
