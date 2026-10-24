// Session guard for API routes (CONTRACTS: all /api/* require an Auth0 session).
import { NextResponse } from "next/server";
import type { SessionData } from "@auth0/nextjs-auth0/types";
import type { ApiResponse } from "@/types";
import { auth0 } from "@/lib/auth0";

export type SessionCheck = { session: SessionData; response?: undefined } | { session?: undefined; response: NextResponse };

// Emergency demo switch (#39): DEMO_AUTH_BYPASS=1 (exactly "1", server-only) skips Auth0 checks.
// The proxy logs each bypassed request; nothing secret is logged.
export const authBypassed = () => process.env.DEMO_AUTH_BYPASS === "1";

const DEMO_SESSION: SessionData = {
  user: { sub: "demo", name: "Demo user" },
  tokenSet: { accessToken: "", expiresAt: 0 },
  internal: { sid: "demo", createdAt: 0 },
};

// Usage in a route: const auth = await requireSession(); if (auth.response) return auth.response;
export async function requireSession(): Promise<SessionCheck> {
  if (authBypassed()) return { session: DEMO_SESSION };
  const session = await auth0.getSession();
  if (!session) {
    return {
      response: NextResponse.json<ApiResponse<never>>({ ok: false, error: "Sign in required" }, { status: 401 }),
    };
  }
  return { session };
}
