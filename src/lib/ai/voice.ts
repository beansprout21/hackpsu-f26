// Voice guard for AI-written text (docs/SPROUT.md voice rule 3), shared by /api/chat and /api/plan.
// "just" is dropped (meaning-safe); any other banned word means the caller keeps its template text.
const BANNED_OTHER = /\b(only|behind|should have|can't afford|cannot afford|waste)\b/i;

export function voiceSafe(text: string): string | null {
  const softened = text.replace(/\bjust\s+/gi, "").replace(/\s+/g, " ").trim();
  return BANNED_OTHER.test(softened) ? null : softened;
}
