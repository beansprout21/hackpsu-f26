// GET /api/banker/plans (Contracts v2.2): SharedPlanSummary[], newest first, max 50. Banker role only.
// Logs route + ok + count + ms only; never names, emails, or plan contents.
import { NextResponse } from "next/server";
import { requireBanker } from "@/lib/server/auth";
import { getRedis, listSummaries, SHARING_UNAVAILABLE } from "@/lib/server/share";
import type { ApiResponse, SharedPlanSummary } from "@/types";

export async function GET() {
  const auth = await requireBanker();
  if (auth.response) return auth.response;
  const started = Date.now();
  const redis = getRedis();
  if (!redis) {
    console.log(`[api/banker/plans] ok=false ms=0 reason=storage_unset`);
    return NextResponse.json<ApiResponse<SharedPlanSummary[]>>({ ok: false, error: SHARING_UNAVAILABLE }, { status: 503 });
  }
  try {
    const data = await listSummaries(redis);
    console.log(`[api/banker/plans] ok=true count=${data.length} ms=${Date.now() - started}`);
    return NextResponse.json<ApiResponse<SharedPlanSummary[]>>({ ok: true, data });
  } catch (error) {
    console.log(`[api/banker/plans] ok=false ms=${Date.now() - started} error=${error instanceof Error ? error.name : "unknown"}`);
    return NextResponse.json<ApiResponse<SharedPlanSummary[]>>({ ok: false, error: SHARING_UNAVAILABLE }, { status: 503 });
  }
}
