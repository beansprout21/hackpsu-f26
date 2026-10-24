// Demo personas from docs/CONTRACTS.md (v2). Maya is the hero; Jordan is the young-family contrast.
// Proof moment: re-run Maya with flipSwipes(maya.intake.swipes) and her finances unchanged.
import type { FinancialSnapshot, IntakeAnswers, SwipeAnswer } from "@/types";

export interface DemoPersona {
  id: "maya" | "jordan";
  name: string;
  label: string;
  intake: IntakeAnswers;
  snapshot: FinancialSnapshot;
}

// Card ids must match src/data/swipeCards.ts (Ethan, #9). Assumed: ids swipe-01..swipe-08,
// with the experiences/freedom option on the left and the security/family option on the right.
// If the cards differ, update these ids and choices so the tallies still produce the values below.
const swipes = (choices: SwipeAnswer["choice"][]): SwipeAnswer[] =>
  choices.map((choice, i) => ({ cardId: `swipe-${String(i + 1).padStart(2, "0")}`, choice }));

export const flipSwipes = (answers: SwipeAnswer[]): SwipeAnswer[] =>
  answers.map((a) => ({ ...a, choice: a.choice === "left" ? "right" : "left" }));

export const maya: DemoPersona = {
  id: "maya",
  name: "Maya",
  label: "College student, no steady job",
  intake: {
    lifeStage: "student",
    swipes: swipes(["left", "left", "left", "right", "left", "left", "right", "left"]),
    values: ["experiences", "freedom"],
    goals: [
      { id: "travel", priority: 1, horizonMonths: 9, targetAmount: 3000, why: "study abroad in Japan" },
      { id: "credit_building", priority: 2, horizonMonths: 12, why: "" },
      { id: "first_home", priority: 3, horizonMonths: 84, why: "own a place after graduation" },
    ],
  },
  snapshot: {
    hasSteadyIncome: false,
    // effective monthly income: 2400 / 9 + 1500 / 4 + 200 = ~$842
    incomeSources: [
      { kind: "summer_savings", amount: 2400, frequency: "one_time" },
      { kind: "aid_refund", amount: 1500, frequency: "per_semester" },
      { kind: "family", amount: 200, frequency: "monthly" },
    ],
    monthlyFixedCosts: 650,
    monthlyDebtPayments: 0,
    savingsBalance: 800,
    creditBand: "building",
    isFnbCustomer: false,
  },
};

export const jordan: DemoPersona = {
  id: "jordan",
  name: "Jordan",
  label: "Young family",
  intake: {
    lifeStage: "young_family",
    swipes: swipes(["right", "right", "left", "right", "right", "right", "left", "right"]),
    values: ["security", "family"],
    goals: [
      { id: "first_home", priority: 1, horizonMonths: 60, targetAmount: 15000, why: "" },
      { id: "emergency_fund", priority: 2, horizonMonths: 12, why: "" },
    ],
  },
  snapshot: {
    hasSteadyIncome: true,
    incomeSources: [{ kind: "job", amount: 2400, frequency: "monthly" }],
    monthlyFixedCosts: 1500,
    monthlyDebtPayments: 150,
    savingsBalance: 1200,
    creditBand: "fair",
    isFnbCustomer: false,
  },
};

export const personas: DemoPersona[] = [maya, jordan];
