// Demo personas from docs/CONTRACTS.md. Both share the SAME snapshot so goals alone change the plan.
import type { FinancialSnapshot, IntakeAnswers } from "@/types";

export interface Persona {
  id: "maya" | "jordan";
  name: string;
  label: string;
  intake: IntakeAnswers;
  snapshot: FinancialSnapshot;
}

export const sharedSnapshot: FinancialSnapshot = {
  monthlyIncome: 2400,
  monthlyFixedCosts: 1500,
  monthlyDebtPayments: 150,
  savingsBalance: 1200,
  creditBand: "building",
  isFnbCustomer: false,
};

export const maya: Persona = {
  id: "maya",
  name: "Maya",
  label: "College student",
  intake: {
    lifeStage: "student",
    values: ["experiences", "freedom"],
    goals: [
      { id: "travel", priority: 1, horizonMonths: 9, targetAmount: 3000, why: "study abroad in Japan" },
      { id: "credit_building", priority: 2, horizonMonths: 12, why: "" },
    ],
  },
  snapshot: sharedSnapshot,
};

export const jordan: Persona = {
  id: "jordan",
  name: "Jordan",
  label: "Young family",
  intake: {
    lifeStage: "young_family",
    values: ["security", "family"],
    goals: [
      // $15,000 = down payment + closing costs
      { id: "first_home", priority: 1, horizonMonths: 60, targetAmount: 15000, why: "" },
      { id: "emergency_fund", priority: 2, horizonMonths: 12, why: "" },
    ],
  },
  snapshot: sharedSnapshot,
};

export const personas: Persona[] = [maya, jordan];
