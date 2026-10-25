// Voice guard for AI-written text (docs/SPROUT.md voice rule 3), shared by /api/chat and /api/plan.
// "just" is dropped and prepositional "behind" ("the skills behind your goals") becomes "for" (both
// meaning-safe, so the banned word never shows); any other banned use means the caller keeps its template.
import type { GoalId, Plan } from "@/types";
import { aboutTime, timeSpan } from "@/lib/client/time";
import { GOAL_LABELS } from "@/lib/server/engine/defaults";

const BANNED_OTHER = /\b(only|behind|should have|can't afford|cannot afford|waste)\b/i;

export function voiceSafe(text: string): string | null {
  const softened = text
    .replace(/\bjust\s+/gi, "")
    .replace(/\bbehind (?=(?:your|the|both|starting|every|each|this|that|these|those|all|a|an)\b)/gi, (m) => (m[0] === "B" ? "For " : "for "))
    .replace(/\s+/g, " ")
    .trim();
  return BANNED_OTHER.test(softened) ? null : softened;
}

// The user-facing name of a goal in AI facts and answers: the emergency_fund goal IS the safety cushion
// (SPROUT.md), so the model never sees "emergency fund" to repeat it.
export const goalWord = (id: GoalId) => (id === "emergency_fund" ? "safety cushion" : GOAL_LABELS[id]);

// DASHBOARD.md v2 "Time is always specific": 24+ months read as whole years ("about 4 years"), via the shared
// formatter. Ranges such as a CD's "3 to 48 months" are product terms and stay as published.
export function specificTimes(text: string): string {
  return text.replace(/(\b(?:about|around|roughly)\s+)?\b(\d[\d,]*)(\s+|-)(months?)\b/gi, (match, about: string | undefined, num: string, sep: string, ...rest) => {
    const offset = rest[rest.length - 2] as number;
    const whole = rest[rest.length - 1] as string;
    const n = Number(num.replace(/,/g, ""));
    if (!Number.isFinite(n) || n < 24) return match;
    if (/\d\s*(?:to|-|–|and)\s*$/.test(whole.slice(Math.max(0, offset - 12), offset))) return match;
    if (sep === "-") return `${about ?? ""}${Math.round(n / 12)}-year`;
    const span = timeSpan(n);
    return span.startsWith("more than") ? span : about ? `${about}${span}` : aboutTime(n);
  });
}

// "$N a month away" (or "$N from on track", "$N short") is a gap claim (DASHBOARD.md goal lines): N must be a
// real gap of an off-track goal (required - allocated) or a turn_up_dial move. Anything else is wrong.
export function gapClaimsConsistent(text: string, plan: Plan, extraGaps: number[] = []): boolean {
  const claims = [
    // "away" counts only as "a month away": "$750 away" is an unlock's dollars-to-go, not a monthly gap.
    ...text.matchAll(/\$\s?([\d,]+)\s*(?:(?:a|per|\/)\s*month\s+away\b|(?:(?:a|per|\/)\s*month\s+)?(?:from|short of) (?:being )?on track\b)/gi),
  ].map((m) => Number(m[1].replace(/,/g, "")));
  if (claims.length === 0) return true;
  const gaps = new Set<number>(extraGaps.map(Math.round));
  for (const a of plan.allocation) {
    if (a.onTrack) continue;
    gaps.add(Math.round(a.requiredMonthly - a.monthlyAmount));
    for (const l of a.levers) if (l.kind === "turn_up_dial") gaps.add(Math.round(l.moveFromGuiltFree));
  }
  return claims.every((n) => gaps.has(n));
}

// Applied to every AI string after the number guard (so derived year counts can't trip it), and to template
// text shown through /api/plan and /api/chat: "safety cushion", never "emergency fund"; specific times.
export function voiceNormalize(text: string): string {
  return specificTimes(text.replace(/\b(e)mergency fund\b/gi, (_m, e: string) => (e === "E" ? "Safety cushion" : "safety cushion")));
}
