// GET /api/banker/plans/[id] (Contracts v2.2): SharedPlan or 404 "Not found". Banker role only.
// Logs route + ok + ms only; never the id, names, emails, or plan contents.
import { NextResponse } from "next/server";
import { requireBanker } from "@/lib/server/auth";
import { getRedis, getSharedPlan, SHARING_UNAVAILABLE } from "@/lib/server/share";
import type { ApiResponse, SharedPlan } from "@/types";

export async function GET(_request: Request, ctx: RouteContext<"/api/banker/plans/[id]">) {
  const auth = await requireBanker();
  if (auth.response) return auth.response;
  const started = Date.now();
  const redis = getRedis();
  if (!redis) {
    console.log(`[api/banker/plan] ok=false ms=0 reason=storage_unset`);
    return NextResponse.json<ApiResponse<SharedPlan>>({ ok: false, error: SHARING_UNAVAILABLE }, { status: 503 });
  }
  try {
    const { id } = await ctx.params;
    const plan = await getSharedPlan(redis, id);
    console.log(`[api/banker/plan] ok=${plan !== null} ms=${Date.now() - started}`);
    if (!plan) return NextResponse.json<ApiResponse<SharedPlan>>({ ok: false, error: "Not found" }, { status: 404 });
    return NextResponse.json<ApiResponse<SharedPlan>>({ ok: true, data: plan });
  } catch (error) {
    console.log(`[api/banker/plan] ok=false ms=${Date.now() - started} error=${error instanceof Error ? error.name : "unknown"}`);
    return NextResponse.json<ApiResponse<SharedPlan>>({ ok: false, error: SHARING_UNAVAILABLE }, { status: 503 });
  }
}
