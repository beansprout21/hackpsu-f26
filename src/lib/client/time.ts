// One time formatter for every user-facing duration (docs/DASHBOARD.md v2 "Time is always specific"):
// under 24 months -> months; 24+ months -> whole years (rounded); over 50 years -> "more than 50 years".
// Never "10+ years". Used by planCopy.ts (Overview), and the what-if answers in src/lib/ai/chat.ts.
export const MAX_YEARS = 50;

// "1 month", "14 months", "3 years", "more than 50 years".
export function timeSpan(months: number): string {
  const m = Math.max(0, Math.round(months));
  if (m < 24) return m === 1 ? "1 month" : `${m} months`;
  if (m > MAX_YEARS * 12) return `more than ${MAX_YEARS} years`;
  const years = Math.round(m / 12);
  return years === 1 ? "1 year" : `${years} years`;
}

// "about 14 months", "about 3 years", "more than 50 years" (no "about" on the cap).
export function aboutTime(months: number): string {
  const span = timeSpan(months);
  return span.startsWith("more than") ? span : `about ${span}`;
}
