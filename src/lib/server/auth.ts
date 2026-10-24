// Session guard for API routes (CONTRACTS: all /api/* require an Auth0 session).
import { NextResponse } from "next/server";
import type { SessionData } from "@auth0/nextjs-auth0/types";
import type { ApiResponse } from "@/types";
import { auth0 } from "@/lib/auth0";

export type SessionCheck = { session: SessionData; response?: undefined } | { session?: undefined; response: NextResponse };

// Usage in a route: const auth = await requireSession(); if (auth.response) return auth.response;
export async function requireSession(): Promise<SessionCheck> {
  const session = await auth0.getSession();
  if (!session) {
    return {
      response: NextResponse.json<ApiResponse<never>>({ ok: false, error: "Sign in required" }, { status: 401 }),
    };
  }
  return { session };
}
