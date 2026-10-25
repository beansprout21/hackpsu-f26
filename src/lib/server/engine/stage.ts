// Rule set D (docs/SPROUT.md): now / next / later with machine-readable unlock triggers.
import type { CreditBand, Product, Stage, UnlockTrigger } from "@/types";
import { usd, type EngineContext } from "./context";

export interface StageResult {
  stage: Stage;
  unlockCondition?: string;
  unlockTrigger?: UnlockTrigger;
}

// "unsure" is treated like "building" for ranking.
const BAND_RANK: Record<CreditBand, number> = { building: 0, unsure: 0, fair: 1, good: 2, excellent: 3 };
const BAND_LABEL: Record<CreditBand, string> = {
  building: "building",
  unsure: "building",
  fair: "fair",
  good: "good",
  excellent: "excellent",
};

const MORTGAGE_LIKE: Product["category"][] = ["mortgage", "home_equity"];
const INCOME_BASED: Product["category"][] = ["personal_loan", "auto_loan", "mortgage", "home_equity"];
const FOUNDATIONAL: Product["category"][] = ["checking", "savings", "education_tool"];
const DEPOSIT_GATED: Product["category"][] = ["cd", "credit_card"];

export const isSecuredCard = (p: Product) =>
  p.category === "credit_card" && (p.eligibility.creditBands?.includes("building") ?? false);
export const isMortgageLike = (p: Product) => MORTGAGE_LIKE.includes(p.category);

// Hard eligibility: failing these can't be fixed by saving, waiting, or a life event.
export function isHardIneligible(p: Product, ctx: EngineContext): boolean {
  // Home equity needs an owned home; the snapshot has no homeowner field, so never offer it.
  if (p.category === "home_equity") return true;
  // v3.1: Sprout never recommends student loans, at any stage (students handle loans with family).
  if (p.category === "student_loan") return true;
  if (p.eligibility.studentOnly && !ctx.isStudent) return true;
  if (p.eligibility.lifeStages && !p.eligibility.lifeStages.includes(ctx.intake.lifeStage)) return true;
  const bands = p.eligibility.creditBands;
  if (bands) {
    // Above every listed band (e.g. a secured card for someone with good credit): not for them.
    const maxRank = Math.max(...bands.map((b) => BAND_RANK[b]));
    if (BAND_RANK[ctx.snapshot.creditBand] > maxRank) return true;
  }
  return false;
}

export function isCreditBlocked(p: Product, ctx: EngineContext): boolean {
  const bands = p.eligibility.creditBands;
  return !!bands && !bands.includes(ctx.snapshot.creditBand);
}

// Returns null when the product is dropped (fails with no reachable condition).
export function stageFor(p: Product, ctx: EngineContext): StageResult | null {
  if (isHardIneligible(p, ctx)) return null;
  const { snapshot, math } = ctx;
  const steady = snapshot.hasSteadyIncome;
  const needsIncome = INCOME_BASED.includes(p.category) || (p.category === "credit_card" && !isSecuredCard(p));

  if (isMortgageLike(p)) {
    // Rule set E (v3): mortgages and homebuyer programs wait for a full-time job + the safety cushion.
    if (steady && snapshot.savingsBalance >= ctx.cushionTarget) return { stage: "next" };
    const amount = ctx.cushionTarget;
    return {
      stage: "later",
      unlockTrigger: { kind: "savings_threshold", amount },
      unlockCondition:
        ctx.isStudent || !steady
          ? `When you have a full-time job and your ${usd(amount)} safety cushion is full`
          : `When your ${usd(amount)} safety cushion is full`,
    };
  }

  if (needsIncome && !steady) {
    return {
      stage: "later",
      unlockTrigger: { kind: "life_event", event: "first_paycheck" },
      unlockCondition: "When your first paycheck arrives",
    };
  }

  if (isCreditBlocked(p, ctx)) {
    const bands = p.eligibility.creditBands ?? [];
    const atLeast = bands.reduce((lo, b) => (BAND_RANK[b] < BAND_RANK[lo] ? b : lo), bands[0]);
    return {
      stage: "later",
      unlockTrigger: { kind: "credit_band", atLeast },
      unlockCondition: `When your credit range reaches ${BAND_LABEL[atLeast]}`,
    };
  }

  if (DEPOSIT_GATED.includes(p.category)) {
    const spare = snapshot.savingsBalance - ctx.cushionTarget;
    const deposit = p.minOpeningDeposit;
    if (deposit === null && p.category === "cd") {
      // Unpublished CD minimum (e.g. CD Specials): wait until the safety cushion is full, then check with FNB.
      if (spare < 0) {
        return {
          stage: "later",
          unlockTrigger: { kind: "savings_threshold", amount: ctx.cushionTarget },
          unlockCondition: `When your safety cushion reaches ${usd(ctx.cushionTarget)} (check the minimum with FNB)`,
        };
      }
    } else if (deposit !== null && isSecuredCard(p) && snapshot.savingsBalance < math.monthlyCosts + deposit) {
      // Rule set E (v3): secured card unlocks at savings >= 1 month of costs + minimum deposit (or the
      // first paycheck), decoupled from the 3-month cushion so credit building can start early.
      const amount = Math.ceil(math.monthlyCosts + deposit);
      return {
        stage: "later",
        unlockTrigger: { kind: "savings_threshold", amount },
        unlockCondition: `When your savings reach ${usd(amount)}: one month of costs plus the ${usd(deposit)} deposit${steady ? "" : " (or your first paycheck arrives)"}`,
      };
    }
  }

  const foundational = FOUNDATIONAL.includes(p.category) || p.minOpeningDeposit === 0;
  return { stage: foundational ? "now" : "next" };
}
