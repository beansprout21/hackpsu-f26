// Server-only Anthropic client. Every AI call has a hard 15s budget and no retries;
// callers fall back to deterministic output on any failure (spec P0: AI fallback).
import Anthropic from "@anthropic-ai/sdk";

export const AI_TIMEOUT_MS = 15_000;

let client: Anthropic | null | undefined;
let loggedDisabled = false;

// Emergency demo switch (#39): AI_DISABLED=1 (exactly "1") turns every AI call off.
export const aiDisabled = () => process.env.AI_DISABLED === "1";

// null when AI is disabled or no API key is configured: callers skip straight to the fallback.
export function getClient(): Anthropic | null {
  if (aiDisabled()) {
    if (!loggedDisabled) {
      console.log("[ai] AI_DISABLED=1: every AI route uses its template fallback");
      loggedDisabled = true;
    }
    return null;
  }
  if (client === undefined) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    client = apiKey ? new Anthropic({ apiKey, maxRetries: 0, timeout: AI_TIMEOUT_MS }) : null;
  }
  return client;
}

export function getModel(): string {
  return process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";
}

export function requestOptions() {
  return { timeout: AI_TIMEOUT_MS, maxRetries: 0, signal: AbortSignal.timeout(AI_TIMEOUT_MS) };
}

// Short, log-safe description of why an AI call failed (never includes request data).
export function describeAiError(error: unknown): string {
  // Fixed labels: class names are minified in production builds.
  if (error instanceof Anthropic.APIConnectionTimeoutError) return "timeout";
  if (error instanceof Anthropic.APIConnectionError) return "connection error";
  if (error instanceof Anthropic.APIError) return `api error status=${error.status ?? "n/a"}`;
  // Our own thrown Errors carry no request data; others (e.g. ZodError) log by name only.
  if (error instanceof Error) return error.name === "Error" ? error.message.slice(0, 80) : error.name;
  return "unknown error";
}

// Interim Sprout voice + advice boundary from docs/SPROUT.md part 1.
// TODO: replace with the SPROUT.md part 2 system prompts when they land.
export const SPROUT_SYSTEM = [
  "You are Sprout, the money guide inside Sprout, an educational prototype built for FNB (First National Bank).",
  "Voice: supportive, optimistic, plain-spoken. Short sentences, everyday words, talk to the user as \"you\".",
  "Never shame spending. Celebrate small wins. Lead with what the user CAN do now, never with what they lack.",
  "Frame \"not yet\" as \"unlocks when\", with the path to unlock it. Guilt-free spending is protected on purpose.",
  "Advice boundary: budgeting, saving, credit building, and FNB products and programs only. If anything touches investing, taxes, or insurance, say \"When you're ready for that, an FNB advisor can help\" and stop.",
  "Never invent products, rates, fees, or numbers. Use only the facts you are given.",
].join("\n");
