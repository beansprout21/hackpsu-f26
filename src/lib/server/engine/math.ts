// Rule set A (docs/SPROUT.md): effective income, surplus, cushion targets.
import type { FinancialSnapshot, IncomeFrequency, IncomeSource } from "@/types";

const PER_MONTH_DIVISOR: Record<IncomeFrequency, number> = {
  monthly: 1,
  per_semester: 4,
  one_time: 9, // spread over the 9-month academic year
};

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
  starterCushion: number; // 1 x (fixed + debt)
  fullCushion: number; // 3 x (fixed + debt) = Plan.emergencyFundTarget
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
  const monthlyCosts = snapshot.monthlyFixedCosts + snapshot.monthlyDebtPayments;
  return {
    incomeLines,
    effectiveMonthlyIncome,
    monthlyFixedCosts: snapshot.monthlyFixedCosts,
    monthlyDebtPayments: snapshot.monthlyDebtPayments,
    monthlySurplus: round2(effectiveMonthlyIncome - monthlyCosts),
    fixedShare: effectiveMonthlyIncome > 0 ? Math.round((monthlyCosts / effectiveMonthlyIncome) * 10000) / 10000 : 1,
    starterCushion: round2(monthlyCosts),
    fullCushion: round2(3 * monthlyCosts),
  };
}

// ceil((target - saved) / monthly); 0 when already reached or when monthly is 0 (contract v2.1).
export function monthsToTarget(target: number, saved: number, monthly: number): number {
  const remaining = target - saved;
  if (remaining <= 0 || monthly <= 0) return 0;
  return Math.ceil(remaining / monthly);
}
