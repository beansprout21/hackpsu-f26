// POST /api/plan: { profile, snapshot, intake } -> ApiResponse<Plan>
// Engine builds the plan; AI rewrites its wording; any AI failure returns the engine plan.
import { NextResponse } from "next/server";
import { z } from "zod";
import type { ApiResponse, Plan } from "@/types";
import { PlanRequestSchema } from "@/types/schemas";
import { buildPlanSkeleton } from "@/lib/server/engine/plan";
import { generatePlan } from "@/lib/ai/plan";

export async function POST(request: Request) {
  // TODO(#7): require an Auth0 session here once src/lib/server/auth.ts lands.
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json<ApiResponse<Plan>>({ ok: false, error: "Body must be JSON" }, { status: 400 });
  }
  const parsed = PlanRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json<ApiResponse<Plan>>({ ok: false, error: z.prettifyError(parsed.error) }, { status: 400 });
  }

  const started = Date.now();
  const { profile, snapshot, intake } = parsed.data;
  let skeleton: Plan;
  try {
    skeleton = buildPlanSkeleton(profile, snapshot, intake);
  } catch (error) {
    console.error("[api/plan] engine failed", error);
    return NextResponse.json<ApiResponse<Plan>>({ ok: false, error: "Could not build a plan" }, { status: 500 });
  }
  const engineMs = Date.now() - started;
  const result = await generatePlan(skeleton, profile);
  console.log(
    `[api/plan] aiUsed=${result.aiUsed} engineMs=${engineMs} totalMs=${Date.now() - started}${result.fallbackReason ? ` fallback=${result.fallbackReason}` : ""}`,
  );
  return NextResponse.json<ApiResponse<Plan>>({ ok: true, data: result.plan });
}
