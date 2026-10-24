// Rule set B (docs/SPROUT.md): 4-bucket spending plan + per-goal allocation.
import type { Allocation, GoalId, ProfiledGoal, SpendingBucket } from "@/types";
import { usd, type EngineContext } from "./context";
import { GOAL_LABELS } from "./defaults";
import { monthsToTarget, round2 } from "./math";

const PRIORITY_WEIGHT: Record<1 | 2 | 3, number> = { 1: 0.5, 2: 0.3, 3: 0.2 };

export interface SpendingResult {
  spendingPlan: SpendingBucket[];
  allocation: Allocation[];
  emergencyMonthly: number;
  goalMonthly: number;
  guiltFreeMonthly: number;
}

// Split `total` whole dollars by weight; leftover dollars go to the first (highest-priority) goal.
function splitByPriority(total: number, goals: ProfiledGoal[]): Map<GoalId, number> {
  const out = new Map<GoalId, number>();
  if (!goals.length || total <= 0) return out;
  const weightSum = goals.reduce((s, g) => s + PRIORITY_WEIGHT[g.priority], 0);
  let given = 0;
  for (const g of goals) {
    const amount = Math.floor((total * PRIORITY_WEIGHT[g.priority]) / weightSum);
    out.set(g.id, amount);
    given += amount;
  }
  out.set(goals[0].id, (out.get(goals[0].id) ?? 0) + (total - given));
  return out;
}

export function buildSpending(ctx: EngineContext): SpendingResult {
  const { math, snapshot, profile } = ctx;
  const surplus = Math.max(math.monthlySurplus, 0);
  // The emergency bucket keeps running until the full 3-month cushion exists.
  const cushionMet = snapshot.savingsBalance >= math.fullCushion;

  const emergencyMonthly = cushionMet ? 0 : Math.floor(0.3 * surplus);
  const goalMonthly = Math.floor((cushionMet ? 0.7 : 0.4) * surplus);
  const guiltFreeMonthly = Math.floor(0.3 * surplus);

  const goals = [...profile.goals].sort((a, b) => a.priority - b.priority);
  const efGoal = goals.find((g) => g.id === "emergency_fund");
  const otherGoals = goals.filter((g) => g.id !== "emergency_fund");

  const allocation: Allocation[] = [];
  const split = splitByPriority(otherGoals.length ? goalMonthly : 0, otherGoals);
  for (const g of goals) {
    if (g.id === "emergency_fund") continue;
    const monthly = split.get(g.id) ?? 0;
    if (monthly > 0) {
      allocation.push({ goalId: g.id, monthlyAmount: monthly, monthsToTarget: monthsToTarget(g.targetAmount, 0, monthly) });
    }
  }
  if (efGoal) {
    // The emergency-fund goal is funded by the emergency bucket (plus goal savings if it's the only goal).
    const monthly = emergencyMonthly + (otherGoals.length ? 0 : goalMonthly);
    if (monthly > 0) {
      allocation.push({
        goalId: "emergency_fund",
        monthlyAmount: monthly,
        monthsToTarget: monthsToTarget(math.fullCushion, snapshot.savingsBalance, monthly),
      });
    }
  }
  allocation.sort(
    (a, b) => goals.findIndex((g) => g.id === a.goalId) - goals.findIndex((g) => g.id === b.goalId),
  );

  const income = math.effectiveMonthlyIncome;
  const pct = (amount: number) => (income > 0 ? Math.min(100, round2((100 * amount) / income)) : 0);
  const fixed = round2(math.monthlyFixedCosts + math.monthlyDebtPayments);
  const noRoom = math.monthlySurplus <= 0;

  const emergencyNote = noRoom
    ? "First we find your breathing room, then this starts growing."
    : cushionMet
      ? "Your 3-month cushion is complete, so this share goes to your goals."
      : ctx.cushionTarget < math.fullCushion && snapshot.savingsBalance < ctx.cushionTarget
        ? `Builds a starter cushion of ${usd(ctx.cushionTarget)}, then 3 months of costs (${usd(math.fullCushion)}).`
        : `Grows your ${usd(snapshot.savingsBalance)} toward 3 months of costs (${usd(math.fullCushion)}).`;

  const goalNames = otherGoals.length ? otherGoals.map((g) => GOAL_LABELS[g.id]).join(", ") : "your emergency fund";

  const spendingPlan: SpendingBucket[] = [
    {
      bucket: "fixed_costs",
      monthlyAmount: fixed,
      percent: pct(fixed),
      note:
        math.monthlyDebtPayments > 0
          ? `Rent, bills, and ${usd(math.monthlyDebtPayments)} in debt payments.`
          : "Rent, bills, and the basics that keep life running.",
    },
    { bucket: "emergency_fund", monthlyAmount: emergencyMonthly, percent: pct(emergencyMonthly), note: emergencyNote },
    {
      bucket: "goal_savings",
      monthlyAmount: goalMonthly,
      percent: pct(goalMonthly),
      note: noRoom ? "Goals start as soon as there's room." : `Split across ${goalNames}, by priority.`,
    },
    {
      bucket: "guilt_free",
      monthlyAmount: guiltFreeMonthly,
      percent: pct(guiltFreeMonthly),
      note: noRoom ? "Protected as soon as there's room." : "Fun money, on purpose. No guilt.",
    },
  ];

  return { spendingPlan, allocation, emergencyMonthly, goalMonthly, guiltFreeMonthly };
}
