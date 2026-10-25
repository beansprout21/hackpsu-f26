// Session guard for API routes (CONTRACTS: all /api/* require an Auth0 session).
import { NextResponse } from "next/server";
import type { SessionData } from "@auth0/nextjs-auth0/types";
import type { ApiResponse } from "@/types";
import { auth0, ROLES_CLAIM } from "@/lib/auth0";

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

// Banker role (Contracts v2.2): Auth0 claim `https://sprout-demo/roles` contains "banker", or the session email is
// in BANKER_EMAILS (comma-separated, server-only). The DEMO_AUTH_BYPASS demo session counts as a banker.
export function isBanker(session: SessionData): boolean {
  if (authBypassed()) return true;
  const roles = session.user[ROLES_CLAIM];
  if (Array.isArray(roles) && roles.includes("banker")) return true;
  const email = typeof session.user.email === "string" ? session.user.email.trim().toLowerCase() : "";
  const allow = (process.env.BANKER_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return email !== "" && allow.includes(email);
}

// Usage in a banker route: const auth = await requireBanker(); if (auth.response) return auth.response;
export async function requireBanker(): Promise<SessionCheck> {
  const auth = await requireSession();
  if (auth.response) return auth;
  if (!isBanker(auth.session)) {
    return {
      response: NextResponse.json<ApiResponse<never>>({ ok: false, error: "Banker access only" }, { status: 403 }),
    };
  }
  return auth;
}
