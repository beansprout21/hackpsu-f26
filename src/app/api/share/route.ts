// /api/share (Contracts v2.2): GET status, POST share (explicit consent), DELETE stop sharing.
// Contact comes from the Auth0 session only. Logs: method + ok + ms, never plan contents or contact fields.
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/server/auth";
import { getRedis, getShareStatus, SHARING_UNAVAILABLE, sharePlan, stopSharing } from "@/lib/server/share";
import type { ApiResponse, ShareStatus } from "@/types";
import { ShareRequestSchema } from "@/types/schemas";

type Handler = (redis: NonNullable<ReturnType<typeof getRedis>>, sub: string, contact: { name: string; email: string }, request: Request) => Promise<NextResponse<ApiResponse<ShareStatus>>>;

const fail = (error: string, status: number) => NextResponse.json<ApiResponse<ShareStatus>>({ ok: false, error }, { status });

function route(method: string, handler: Handler) {
  return async (request: Request) => {
    const auth = await requireSession();
    if (auth.response) return auth.response;
    const started = Date.now();
    const log = (ok: boolean, note = "") => console.log(`[api/share] method=${method} ok=${ok} ms=${Date.now() - started}${note}`);
    const redis = getRedis();
    if (!redis) {
      log(false, " reason=storage_unset");
      return fail(SHARING_UNAVAILABLE, 503);
    }
    const { user } = auth.session;
    const contact = { name: String(user.name ?? user.email ?? ""), email: String(user.email ?? "") };
    try {
      const response = await handler(redis, user.sub, contact, request);
      log(response.status < 400);
      return response;
    } catch (error) {
      log(false, ` error=${error instanceof Error ? error.name : "unknown"}`);
      return fail(SHARING_UNAVAILABLE, 503);
    }
  };
}

export const GET = route("GET", async (redis, sub) =>
  NextResponse.json<ApiResponse<ShareStatus>>({ ok: true, data: await getShareStatus(redis, sub) }),
);

export const POST = route("POST", async (redis, sub, contact, request) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("Body must be JSON", 400);
  }
  const parsed = ShareRequestSchema.safeParse(body);
  if (!parsed.success) {
    const missingConsent = parsed.error.issues.some((i) => i.path[0] === "consent");
    return fail(missingConsent ? "Consent is required to share your plan" : z.prettifyError(parsed.error), 400);
  }
  return NextResponse.json<ApiResponse<ShareStatus>>({ ok: true, data: await sharePlan(redis, sub, contact, parsed.data) });
});

export const DELETE = route("DELETE", async (redis, sub) =>
  NextResponse.json<ApiResponse<ShareStatus>>({ ok: true, data: await stopSharing(redis, sub) }),
);
