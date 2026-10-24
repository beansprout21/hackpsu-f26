// Per-goal product scoring (issue #3): goalFit 0..40, eligibility 0..25, affordability 0..20, priority 0..15.
import type { GoalId, Product, ProfiledGoal, ScoreBreakdown, ValueTag } from "@/types";
import type { EngineContext } from "./context";
import { isCreditBlocked, isHardIneligible, isMortgageLike } from "./stage";

const PRIORITY_POINTS: Record<1 | 2 | 3, number> = { 1: 15, 2: 9, 3: 5 };
const VALUE_AFFINITY_BONUS = 3;

// Value tilt: goals that match the user's top values get a small priority bump.
const VALUE_GOALS: Record<ValueTag, GoalId[]> = {
  experiences: ["travel"],
  freedom: ["travel", "small_business"],
  security: ["emergency_fund"],
  family: ["family", "first_home"],
  growth: ["education", "small_business"],
  simplicity: ["everyday_banking"],
};

const NO_DEPOSIT_CATEGORIES: Product["category"][] = ["checking", "savings", "education_tool"];

function affordability(p: Product, ctx: EngineContext): number {
  const { snapshot, math } = ctx;
  if (isMortgageLike(p)) return snapshot.hasSteadyIncome && snapshot.savingsBalance >= math.fullCushion ? 12 : 4;
  const deposit = p.minOpeningDeposit;
  if (deposit === 0) return 20;
  if (deposit === null) {
    if (NO_DEPOSIT_CATEGORIES.includes(p.category)) return 14; // $0 in a branch
    if (p.category === "cd") return 2; // unpublished, likely high minimum
    return 10;
  }
  const spare = snapshot.savingsBalance - ctx.cushionTarget;
  if (deposit <= spare) return 16;
  if (deposit <= snapshot.savingsBalance) return 10;
  return 4;
}

export function scoreProduct(p: Product, goal: Pick<ProfiledGoal, "id" | "priority">, ctx: EngineContext): ScoreBreakdown | null {
  const tagIndex = p.goalTags.indexOf(goal.id);
  if (tagIndex === -1 || isHardIneligible(p, ctx)) return null;
  const affinity = ctx.values.some((v) => VALUE_GOALS[v].includes(goal.id)) ? VALUE_AFFINITY_BONUS : 0;
  return {
    goalFit: tagIndex === 0 ? 40 : 30,
    eligibility: isCreditBlocked(p, ctx) ? 15 : 25,
    affordability: affordability(p, ctx),
    priority: Math.min(15, PRIORITY_POINTS[goal.priority] + affinity),
  };
}

export const totalScore = (b: ScoreBreakdown) => b.goalFit + b.eligibility + b.affordability + b.priority;

// The user's top-value goal (rule set C: its turn-up-the-dial lever is presented first).
export function topValueGoal(ctx: EngineContext): GoalId | undefined {
  const top = ctx.values[0];
  if (!top) return undefined;
  return [...ctx.profile.goals]
    .sort((a, b) => a.priority - b.priority)
    .find((g) => VALUE_GOALS[top].includes(g.id))?.id;
}
