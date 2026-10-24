// Next 16 proxy (formerly middleware): mounts the Auth0 routes (/auth/login, /auth/callback,
// /auth/logout, /auth/profile, ...) and gates the signed-in pages. /intake stays public;
// API routes check the session themselves with requireSession().
import { NextResponse, type NextRequest } from "next/server";
import { auth0 } from "@/lib/auth0";

const PROTECTED_PAGES = ["/snapshot", "/plan"];
const RETURN_TO_AFTER_LOGIN = "/snapshot";

export async function proxy(request: NextRequest) {
  const authResponse = await auth0.middleware(request);
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/auth")) return authResponse;

  if (PROTECTED_PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    const session = await auth0.getSession(request);
    if (!session) {
      const login = new URL("/auth/login", request.nextUrl.origin);
      login.searchParams.set("returnTo", RETURN_TO_AFTER_LOGIN);
      return NextResponse.redirect(login);
    }
  }
  return authResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)"],
};
