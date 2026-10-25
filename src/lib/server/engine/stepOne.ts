// Rule set D (docs/SPROUT.md v3): Step one is personal and doable in the next 2 minutes from a phone,
// never "open an account". Title and detail are Ben's templates; the AI never rewrites them
// (src/lib/ai/plan.ts keeps the engine's stepOne). First match wins.
import type { GoalId, PlanStep } from "@/types";
import { usd, type EngineContext } from "./context";
import type { SpendingResult } from "./spending";

// Fund names for rule D rows 4 and 5. credit_building and everyday_banking have their own rows.
const FUND_NAMES: Partial<Record<GoalId, string>> = {
  travel: "travel fund",
  first_home: "home fund",
  education: "education fund",
  small_business: "business fund",
  family: "family fund",
  emergency_fund: "safety cushion",
};

// The best-fit everyday checking account for a non-customer (the "FNB fit" shown under Step one).
export function fitCheckingId(ctx: EngineContext): string {
  return ctx.isStudent ? "student-checking" : "freestyle-checking";
}

export function chooseStepOne(ctx: EngineContext, spending: SpendingResult): PlanStep {
  const base = { order: 1, stage: "now" as const, startMonth: 0 };
  const { math, profile } = ctx;
  const amount = usd(math.monthlySurplus < 100 ? 10 : 20);
  const p1 = [...profile.goals].sort((a, b) => a.priority - b.priority)[0];

  // Row 1: no breathing room yet.
  if (math.monthlySurplus <= 0) {
    return {
      ...base,
      kind: "budget",
      title: "Open your bank app and find last week's 3 biggest buys.",
      detail: "That's where we'll find your breathing room.",
    };
  }
  // Row 2: credit building first.
  if (p1?.id === "credit_building") {
    return {
      ...base,
      kind: "learn",
      title: "Check your free credit report now.",
      detail: "5 minutes at annualcreditreport.com. Free, and it doesn't hurt your score.",
    };
  }
  // Row 3: everyday banking first.
  if (p1?.id === "everyday_banking") {
    return {
      ...base,
      kind: "habit",
      title: "Turn on low-balance alerts in your bank app.",
      detail: "No surprise fees, ever.",
    };
  }
  // Row 4: the safety cushion is the goal, there are no goals, or (v3.1) a security/family top value
  // while the cushion isn't met.
  const cushionMet = ctx.snapshot.savingsBalance >= ctx.cushionTarget;
  if (!p1 || p1.id === "emergency_fund" || (ctx.cushionFirst && !cushionMet)) {
    return {
      ...base,
      kind: "save",
      title: `Move ${amount} into savings right now.`,
      detail: `That starts your ${usd(ctx.cushionTarget)} safety cushion.`,
    };
  }
  // Row 5: the P1 goal's fund.
  const monthly = spending.allocation.find((a) => a.goalId === p1.id)?.monthlyAmount ?? 0;
  return {
    ...base,
    kind: "save",
    title: `Move ${amount} into your ${FUND_NAMES[p1.id] ?? `${p1.id.replace(/_/g, " ")} fund`} right now.`,
    detail: `You'll put ${usd(monthly)} a month toward it. This starts it.`,
  };
}
