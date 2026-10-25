// POST /api/extract: multipart `file` -> ApiResponse<ExtractedSnapshot> (Contracts v2.3).
// The file is read in memory for this request only. Never log file contents, file names, or extracted
// values: the log line is route, ok, ms, size bucket, file type, and a fixed failure label.
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { ApiResponse, ExtractedSnapshot } from "@/types";
import { requireSession } from "@/lib/server/auth";
import { getClient } from "@/lib/ai/client";
import { EXTRACT_MEDIA_TYPES, extractSnapshot, type ExtractMediaType } from "@/lib/ai/extract";

export const maxDuration = 30;

const MAX_BYTES = 4 * 1024 * 1024;
const FALLBACK_ERROR = "Couldn't read that file. You can type your numbers instead.";
const UNAVAILABLE_ERROR = "Upload is unavailable right now";

const sizeBucket = (bytes: number) => (bytes < 1024 * 1024 ? "<1MB" : bytes < 2 * 1024 * 1024 ? "1-2MB" : bytes <= MAX_BYTES ? "2-4MB" : ">4MB");
const isMediaType = (t: string): t is ExtractMediaType => (EXTRACT_MEDIA_TYPES as readonly string[]).includes(t);

// Fixed labels only: an SDK parse error message could quote the model's output, which echoes the document.
function failureLabel(error: unknown): string {
  if (error instanceof Anthropic.APIConnectionTimeoutError) return "timeout";
  if (error instanceof Anthropic.APIConnectionError) return "connection error";
  if (error instanceof Anthropic.APIError) return `api error status=${error.status ?? "n/a"}`;
  if (error instanceof DOMException && (error.name === "TimeoutError" || error.name === "AbortError")) return "timeout";
  if (error instanceof Error && /^(stop_reason=\w+|no parsed output|ai unavailable)$/.test(error.message)) return error.message;
  return "invalid output";
}

const fail = (error: string, status: number) => NextResponse.json<ApiResponse<ExtractedSnapshot>>({ ok: false, error }, { status });

export async function POST(request: Request) {
  const auth = await requireSession();
  if (auth.response) return auth.response;

  const started = Date.now();
  const log = (ok: boolean, detail: string) => console.log(`[api/extract] ok=${ok} ms=${Date.now() - started} ${detail}`);

  if (!getClient()) {
    log(false, "reason=ai unavailable");
    return fail(UNAVAILABLE_ERROR, 503);
  }

  let file: FormDataEntryValue | null;
  try {
    file = (await request.formData()).get("file");
  } catch {
    log(false, "reason=bad form");
    return fail("Choose a file to upload.", 400);
  }
  if (!(file instanceof File) || file.size === 0) {
    log(false, "reason=no file");
    return fail("Choose a file to upload.", 400);
  }
  const type = file.type === "image/jpg" ? "image/jpeg" : file.type;
  const detail = `size=${sizeBucket(file.size)} type=${type === "application/pdf" ? "pdf" : type.startsWith("image/") ? "image" : "other"}`;
  if (!isMediaType(type)) {
    log(false, `${detail} reason=wrong type`);
    return fail("Upload a PDF or a photo (PNG, JPG, or WebP).", 400);
  }
  if (file.size > MAX_BYTES) {
    log(false, `${detail} reason=too large`);
    return fail("That file is over 4 MB. Try a smaller file or a photo of the page.", 400);
  }

  try {
    const data = await extractSnapshot(await file.arrayBuffer(), type);
    log(true, detail);
    return NextResponse.json<ApiResponse<ExtractedSnapshot>>({ ok: true, data });
  } catch (error) {
    log(false, `${detail} reason=${failureLabel(error)}`);
    return fail(FALLBACK_ERROR, 422);
  }
}
