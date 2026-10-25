// Scenario test fixtures (#78): 9 realistic users run through the engine by scripts/scenarios.ts.
// Maya, Jordan, and Maya's opposite swipes reuse the demo personas; the rest are built the same way.
// Values are derived from the swipes like the intake does, and profiles use the deterministic
// /api/profile fallback, so the run needs no AI.
import type { FinancialSnapshot, GoalAnswer, GoalProfile, IntakeAnswers, LifeStage, SwipeAnswer } from "@/types";
import { deriveValues } from "@/components/intake/draft";
import { fallbackProfile } from "@/lib/ai/profile";
import { jordan, maya, mayaOpposite } from "./personas";

export interface Scenario {
  id: string;
  name: string;
  intake: IntakeAnswers;
  snapshot: FinancialSnapshot;
  profile: GoalProfile;
}

// Card ids follow src/data/swipeCards.ts: left = experiences/freedom/growth, right = security/family/simplicity.
const swipes = (choices: SwipeAnswer["choice"][]): SwipeAnswer[] =>
  choices.map((choice, i) => ({ cardId: `swipe-${String(i + 1).padStart(2, "0")}`, choice }));

function intakeOf(lifeStage: LifeStage, choices: SwipeAnswer["choice"][], goals: GoalAnswer[]): IntakeAnswers {
  const answers = swipes(choices);
  return { lifeStage, swipes: answers, values: deriveValues(answers), goals };
}

function scenario(id: string, name: string, intake: IntakeAnswers, snapshot: FinancialSnapshot): Scenario {
  return { id, name, intake, snapshot, profile: fallbackProfile(intake) };
}

export const scenarios: Scenario[] = [
  scenario("maya", "Maya (hero student)", maya.intake, maya.snapshot),
  scenario("jordan", "Jordan (young family)", jordan.intake, jordan.snapshot),
  scenario("maya-opposite", "Maya, opposite swipes", mayaOpposite.intake, mayaOpposite.snapshot),
  scenario(
    "no-income",
    "No money coming in",
    intakeOf("student", ["left", "right", "left", "left", "right", "right", "left", "right"], [
      { id: "education", priority: 1, horizonMonths: 12, targetAmount: 1000, why: "textbooks and a summer course" },
      { id: "emergency_fund", priority: 2, horizonMonths: 12, why: "" },
    ]),
    {
      hasSteadyIncome: false,
      incomeSources: [],
      monthlyFixedCosts: 400,
      monthlyDebtPayments: 0,
      savingsBalance: 100,
      creditBand: "unsure",
      isFnbCustomer: false,
    },
  ),
  scenario(
    "parents-pay-rent",
    "Parents pay rent ($150 costs)",
    intakeOf("student", ["left", "left", "left", "right", "left", "left", "left", "right"], [
      { id: "travel", priority: 1, horizonMonths: 6, targetAmount: 1200, why: "spring break with friends" },
      { id: "emergency_fund", priority: 2, horizonMonths: 12, why: "" },
    ]),
    {
      hasSteadyIncome: false,
      incomeSources: [
        { kind: "family", amount: 400, frequency: "monthly" },
        { kind: "gig", amount: 200, frequency: "monthly" },
      ],
      monthlyFixedCosts: 150,
      monthlyDebtPayments: 0,
      savingsBalance: 200,
      creditBand: "unsure",
      isFnbCustomer: false,
    },
  ),
  scenario(
    "high-fixed",
    "Fixed costs > 60% of income",
    intakeOf("new_grad", ["right", "right", "left", "right", "right", "right", "right", "left"], [
      { id: "first_home", priority: 1, horizonMonths: 60, targetAmount: 12000, why: "stop paying rent" },
      { id: "credit_building", priority: 2, horizonMonths: 12, why: "" },
    ]),
    {
      hasSteadyIncome: true,
      incomeSources: [{ kind: "job", amount: 2000, frequency: "monthly" }],
      monthlyFixedCosts: 1300,
      monthlyDebtPayments: 250,
      savingsBalance: 300,
      creditBand: "fair",
      isFnbCustomer: false,
    },
  ),
  scenario(
    "cushion-met",
    "Already has 3+ months saved",
    intakeOf("new_grad", ["left", "left", "left", "left", "left", "right", "left", "left"], [
      { id: "travel", priority: 1, horizonMonths: 18, targetAmount: 4000, why: "two weeks in Portugal" },
      { id: "first_home", priority: 2, horizonMonths: 60, why: "" },
    ]),
    {
      hasSteadyIncome: true,
      incomeSources: [{ kind: "job", amount: 3200, frequency: "monthly" }],
      monthlyFixedCosts: 1400,
      monthlyDebtPayments: 200,
      savingsBalance: 6000,
      creditBand: "good",
      isFnbCustomer: false,
    },
  ),
  scenario(
    "fnb-customer",
    "Existing FNB customer",
    intakeOf("student", ["right", "left", "right", "right", "left", "right", "right", "left"], [
      { id: "emergency_fund", priority: 1, horizonMonths: 12, why: "" },
      { id: "credit_building", priority: 2, horizonMonths: 12, why: "rent my own apartment" },
    ]),
    {
      hasSteadyIncome: false,
      incomeSources: [
        { kind: "work_study", amount: 600, frequency: "monthly" },
        { kind: "scholarship", amount: 1500, frequency: "per_semester" },
      ],
      monthlyFixedCosts: 700,
      monthlyDebtPayments: 0,
      savingsBalance: 300,
      creditBand: "building",
      isFnbCustomer: true,
    },
  ),
  scenario(
    "excellent-credit",
    "Excellent credit with a credit goal",
    intakeOf("new_grad", ["left", "left", "right", "left", "left", "left", "left", "right"], [
      { id: "credit_building", priority: 1, horizonMonths: 12, why: "keep my score strong" },
      { id: "travel", priority: 2, horizonMonths: 12, targetAmount: 3000, why: "see my family in Korea" },
    ]),
    {
      hasSteadyIncome: true,
      incomeSources: [{ kind: "job", amount: 3800, frequency: "monthly" }],
      monthlyFixedCosts: 1600,
      monthlyDebtPayments: 300,
      savingsBalance: 3000,
      creditBand: "excellent",
      isFnbCustomer: false,
    },
  ),
];
