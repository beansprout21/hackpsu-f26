// POST /api/profile: { intake: IntakeAnswers } -> ApiResponse<GoalProfile>
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/server/auth";
import { z } from "zod";
import type { ApiResponse, GoalProfile } from "@/types";
import { ProfileRequestSchema } from "@/types/schemas";
import { generateProfile } from "@/lib/ai/profile";

export async function POST(request: Request) {
  const auth = await requireSession();
  if (auth.response) return auth.response;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json<ApiResponse<GoalProfile>>({ ok: false, error: "Body must be JSON" }, { status: 400 });
  }
  const parsed = ProfileRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json<ApiResponse<GoalProfile>>(
      { ok: false, error: z.prettifyError(parsed.error) },
      { status: 400 },
    );
  }

  const started = Date.now();
  const result = await generateProfile(parsed.data.intake);
  console.log(
    `[api/profile] aiUsed=${result.aiUsed} ms=${Date.now() - started}${result.fallbackReason ? ` fallback=${result.fallbackReason}` : ""}`,
  );
  return NextResponse.json<ApiResponse<GoalProfile>>({ ok: true, data: result.profile });
}
