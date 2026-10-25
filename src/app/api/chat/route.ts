// POST /api/chat (v2.3): { question, profile, plan, snapshot?, history?, intent? } -> ApiResponse<{ answer, citedProductIds }>
// Logs route, intent kind, and timing only: never the question or the conversation history.
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/server/auth";
import { z } from "zod";
import type { ApiResponse } from "@/types";
import { ChatRequestSchema } from "@/types/schemas";
import { answerQuestion, type ChatAnswer } from "@/lib/ai/chat";

const MAX_QUESTION_CHARS = 500;

export async function POST(request: Request) {
  const auth = await requireSession();
  if (auth.response) return auth.response;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json<ApiResponse<ChatAnswer>>({ ok: false, error: "Body must be JSON" }, { status: 400 });
  }
  const parsed = ChatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json<ApiResponse<ChatAnswer>>({ ok: false, error: z.prettifyError(parsed.error) }, { status: 400 });
  }
  if (parsed.data.question.length > MAX_QUESTION_CHARS) {
    return NextResponse.json<ApiResponse<ChatAnswer>>(
      { ok: false, error: `Question must be ${MAX_QUESTION_CHARS} characters or fewer` },
      { status: 400 },
    );
  }

  const started = Date.now();
  const { question, profile, plan, snapshot, history, intent } = parsed.data;
  const result = await answerQuestion(question, profile, plan, { snapshot, history, intent });
  console.log(
    `[api/chat] route=${result.route} intent=${result.intent} history=${history?.length ?? 0} aiUsed=${result.aiUsed} ms=${Date.now() - started}${result.fallbackReason ? ` fallback=${result.fallbackReason}` : ""}`,
  );
  return NextResponse.json<ApiResponse<ChatAnswer>>({
    ok: true,
    data: { answer: result.answer, citedProductIds: result.citedProductIds },
  });
}
