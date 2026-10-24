// Rule set C (docs/SPROUT.md): the single clearest action doable this week. First match wins.
import type { PlanStep } from "@/types";
import { getProduct } from "@/lib/server/catalog";
import type { EngineContext } from "./context";
import type { Candidate } from "./select";

// Product id of the checking account Step one opens for non-customers.
export function stepOneCheckingId(ctx: EngineContext): string {
  return ctx.isStudent ? "student-checking" : "freestyle-checking";
}

export function chooseStepOne(ctx: EngineContext, matches: Candidate[]): PlanStep {
  const base = { order: 1, stage: "now" as const, startMonth: 0 };
  const { snapshot, math } = ctx;

  if (!snapshot.isFnbCustomer) {
    const id = stepOneCheckingId(ctx);
    const name = getProduct(id)?.name ?? "FNB checking";
    return {
      ...base,
      kind: "open",
      productId: id,
      title: `Open ${name} this week`,
      // Rule set D: best-fit checking, its fee and how to avoid it, $0; HUB branch for Penn State students.
      detail: ctx.isStudent
        ? "No monthly fee on Student Checking and no minimum balance, so it's $0 to start. At Penn State? The FNB branch in the HUB is at 288 Pollock Road."
        : "No monthly fee when you choose free online statements, and $0 to open in a branch.",
    };
  }
  if (snapshot.savingsBalance < ctx.cushionTarget) {
    return {
      ...base,
      kind: "habit",
      title: "Automate it: set a transfer for the day money arrives",
      detail: "Money moved before you spend builds your cushion on autopilot.",
    };
  }
  if (math.monthlySurplus <= 0) {
    return {
      ...base,
      kind: "budget",
      title: "Track one month of spending",
      detail: "Write down where every dollar goes this month. That's how we find your breathing room.",
    };
  }
  const bestNow = matches.filter((m) => m.staging.stage === "now").sort((a, b) => b.score - a.score)[0];
  if (bestNow) {
    return {
      ...base,
      kind: bestNow.product.category === "education_tool" ? "learn" : "open",
      productId: bestNow.product.id,
      title: `${bestNow.product.category === "education_tool" ? "Try" : "Open"} ${bestNow.product.name} this week`,
      detail: bestNow.product.keyTerms[0] ?? "",
    };
  }
  return {
    ...base,
    kind: "budget",
    title: "Set your spending plan this week",
    detail: "Give every dollar a job: bills, cushion, goals, and guilt-free fun.",
  };
}
