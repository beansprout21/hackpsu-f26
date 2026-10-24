// Fit-first, fee-transparent (docs/SPROUT.md rule set E): every account card says its fee and
// how THIS user avoids it. Facts come from the catalog / docs/research-fnb-catalog.md only.
import type { Product } from "@/types";
import type { EngineContext } from "./context";

type FeeNote = (ctx: EngineContext) => string;

const FEE_NOTES: Record<string, FeeNote> = {
  "student-checking": () => "No monthly fee on Student Checking",
  "estyle-checking": () => "Monthly fee waived with any deposit (or 5 transactions) each statement cycle",
  "freestyle-checking": () => "No monthly fee when you choose free online statements",
  "firstrate-savings": (ctx) =>
    ctx.snapshot.savingsBalance >= 500
      ? "$5 monthly fee, already waived by your $500+ balance"
      : "$5 monthly fee, waived once your balance averages $500",
  "firstrate-money-market": (ctx) =>
    ctx.snapshot.savingsBalance >= 5000
      ? "$10 monthly fee, already waived by your $5,000+ balance"
      : "$10 monthly fee, waived once your balance averages $5,000",
  "savers-goal-cd": () => "No monthly fee listed; an early withdrawal penalty applies",
  "cd-special": () => "Early withdrawal penalties may apply",
  "smartsecured-card": () => "No annual fee",
  "smartcash-card": () => "No annual fee",
  "smartrewards-card": () => "No annual fee",
  "smartrate-card": () => "No annual fee",
  "free-small-business-checking": () => "No monthly fee",
};

const FEE_TERM = /fee|charge|penalt|waiv/i;

export function feeNote(p: Product, ctx: EngineContext): string | null {
  const known = FEE_NOTES[p.id];
  if (known) return known(ctx);
  if (p.category === "education_tool") return "Free";
  // Any other product: its own published fee term, else say plainly that none is listed.
  const published = p.keyTerms.find((t) => FEE_TERM.test(t));
  if (published) return published;
  if (p.category === "credit_card") return "No annual fee listed";
  if (["checking", "savings", "cd", "small_business"].includes(p.category)) return "No monthly fee listed";
  return null;
}

// Terms to know: the fee line first, then other key terms (max 3, no duplicates).
export function termsWithFee(p: Product, ctx: EngineContext): string[] {
  const fee = feeNote(p, ctx);
  const rest = p.keyTerms.filter((t) => t !== fee && (!fee || !FEE_TERM.test(t)));
  return (fee ? [fee, ...rest] : rest).slice(0, 3);
}
