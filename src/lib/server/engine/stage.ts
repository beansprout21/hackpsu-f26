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
    if (steady && snapshot.savingsBalance >= math.fullCushion) return { stage: "next" };
    const amount = math.fullCushion;
    return {
      stage: "later",
      unlockTrigger: { kind: "savings_threshold", amount },
      unlockCondition:
        ctx.isStudent || !steady
          ? `When you have a full-time job and 3 months of expenses (${usd(amount)}) saved`
          : `When 3 months of expenses (${usd(amount)}) are saved`,
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
      // Unpublished CD minimum (e.g. CD Specials): wait until the cushion is in place, then check with FNB.
      if (spare < 0) {
        return {
          stage: "later",
          unlockTrigger: { kind: "savings_threshold", amount: ctx.cushionTarget },
          unlockCondition: `When your cushion reaches ${usd(ctx.cushionTarget)} (check the minimum with FNB)`,
        };
      }
    } else if (deposit !== null && isSecuredCard(p) && spare < deposit) {
      // Rule set E: secured card unlocks at savings >= target cushion + minimum deposit.
      const amount = Math.ceil(ctx.cushionTarget + deposit);
      return {
        stage: "later",
        unlockTrigger: { kind: "savings_threshold", amount },
        unlockCondition: `When your savings reach ${usd(amount)}, so the ${usd(deposit)} deposit leaves your cushion untouched${steady ? "" : " (or your first paycheck arrives)"}`,
      };
    }
  }

  const foundational = FOUNDATIONAL.includes(p.category) || p.minOpeningDeposit === 0;
  return { stage: foundational ? "now" : "next" };
}
