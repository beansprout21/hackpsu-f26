// Rule set A (docs/SPROUT.md v3): effective income, surplus, safety cushion.
import type { FinancialSnapshot, IncomeFrequency, IncomeSource } from "@/types";

const PER_MONTH_DIVISOR: Record<IncomeFrequency, number> = {
  monthly: 1,
  per_semester: 4,
  one_time: 9, // spread over the 9-month academic year
};

// v3: the safety cushion is 3 months of (fixed + debt) for everyone, never below $1,000.
export const CUSHION_MONTHS = 3;
export const CUSHION_FLOOR = 1000;

export interface IncomeLine extends IncomeSource {
  monthlyEquivalent: number;
}

export interface MoneyMath {
  incomeLines: IncomeLine[]; // the "show the math" breakdown for the UI
  effectiveMonthlyIncome: number;
  monthlyFixedCosts: number;
  monthlyDebtPayments: number;
  monthlySurplus: number; // may be <= 0
  fixedShare: number; // (fixed + debt) / effective income; 0..1+ (Infinity-safe: 1 when income is 0)
  monthlyCosts: number; // 1 x (fixed + debt): the "1 month covered" milestone
  safetyCushion: number; // max($1,000, 3 x monthlyCosts) = Plan.cushionTarget = Plan.emergencyFundTarget
}

export const round2 = (n: number) => Math.round(n * 100) / 100;

export function computeMath(snapshot: FinancialSnapshot): MoneyMath {
  const incomeLines = snapshot.incomeSources.map((s) => ({
    ...s,
    monthlyEquivalent: round2(s.amount / PER_MONTH_DIVISOR[s.frequency]),
  }));
  const effectiveMonthlyIncome = round2(
    snapshot.incomeSources.reduce((sum, s) => sum + s.amount / PER_MONTH_DIVISOR[s.frequency], 0),
  );
  const monthlyCosts = round2(snapshot.monthlyFixedCosts + snapshot.monthlyDebtPayments);
  return {
    incomeLines,
    effectiveMonthlyIncome,
    monthlyFixedCosts: snapshot.monthlyFixedCosts,
    monthlyDebtPayments: snapshot.monthlyDebtPayments,
    monthlySurplus: round2(effectiveMonthlyIncome - monthlyCosts),
    fixedShare: effectiveMonthlyIncome > 0 ? Math.round((monthlyCosts / effectiveMonthlyIncome) * 10000) / 10000 : 1,
    monthlyCosts,
    safetyCushion: Math.max(CUSHION_FLOOR, round2(CUSHION_MONTHS * monthlyCosts)),
  };
}

// ceil((target - saved) / monthly); 0 when already reached or when monthly is 0 (contract v2.1).
export function monthsToTarget(target: number, saved: number, monthly: number): number {
  const remaining = target - saved;
  if (remaining <= 0 || monthly <= 0) return 0;
  return Math.ceil(remaining / monthly);
}
