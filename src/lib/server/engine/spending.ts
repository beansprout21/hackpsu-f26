// Rule sets B, C, F (docs/SPROUT.md v3): spending plan, per-goal allocation with gap levers,
// safety cushion fill time and milestone, and the Future You row.
import type { Allocation, FutureYou, GapLever, GoalId, ProfiledGoal, SpendingBucket } from "@/types";
import { usd, type EngineContext } from "./context";
import { timeSpan } from "@/lib/client/time";
import { GOAL_LABELS } from "./defaults";
import { monthsToTarget, round2 } from "./math";

// #106 (lead 2:15 AM): weights go by rank among money goals (1st, 2nd, 3rd after habits are removed), not raw priority.
const RANK_WEIGHT = [0.6, 0.25, 0.15];
const HIGH_FIXED_SHARE = 0.6;
const GUILT_FREE_FLOOR = 0.1; // turn_up_dial never takes guilt-free below 10% of income

export interface SpendingResult {
  spendingPlan: SpendingBucket[];
  allocation: Allocation[];
  emergencyMonthly: number;
  goalMonthly: number;
  savingsMonthly: number;
  guiltFreeMonthly: number;
  futureYou: FutureYou;
  highFixedCosts: boolean;
  cushionFillsInMonths: number | null;
  // Rule set B (v3): months until "1 month covered" (1 x fixed + debt); null once reached or when nothing is saved.
  milestoneInMonths: number | null;
}

// Split whole dollars by rank weight among the money goals (renormalized); leftover dollars go to the first goal.
function splitByPriority(total: number, goals: ProfiledGoal[], moneyGoals: ProfiledGoal[]): Map<GoalId, number> {
  const out = new Map<GoalId, number>();
  if (!goals.length || total <= 0) return out;
  const weight = (g: ProfiledGoal) => RANK_WEIGHT[moneyGoals.indexOf(g)] ?? RANK_WEIGHT[RANK_WEIGHT.length - 1];
  const weightSum = goals.reduce((s, g) => s + weight(g), 0);
  let given = 0;
  for (const g of goals) {
    const amount = Math.floor((total * weight(g)) / weightSum);
    out.set(g.id, amount);
    given += amount;
  }
  out.set(goals[0].id, (out.get(goals[0].id) ?? 0) + (total - given));
  return out;
}

// Rule set C: levers for an off-track goal; turn_up_dial first when guilt-free stays >= 10% of income.
function leversFor(target: number, horizon: number, monthly: number, required: number, guiltFree: number, income: number): GapLever[] {
  const levers: GapLever[] = [];
  const move = required - monthly;
  if (move > 0 && guiltFree - move >= GUILT_FREE_FLOOR * income) {
    levers.push({ kind: "turn_up_dial", moveFromGuiltFree: move });
  }
  if (monthly > 0) {
    levers.push({ kind: "more_time", newHorizonMonths: Math.ceil(target / monthly) });
    levers.push({ kind: "smaller_target", reachableAmount: monthly * horizon });
  }
  return levers;
}

function futureYouFor(ctx: EngineContext, earmark: number, highFixed: boolean): FutureYou {
  if (ctx.studentRules) {
    return {
      earmarkMonthly: null,
      handoff: "An FNB advisor can help you start.",
      unlockCondition: "Unlocks with your first full-time paycheck",
    };
  }
  if (!highFixed && earmark > 0) {
    return { earmarkMonthly: earmark, handoff: "An FNB advisor can help you choose how." };
  }
  return {
    earmarkMonthly: null,
    handoff: "An FNB advisor can help you start.",
    unlockCondition: "Unlocks when fixed costs drop below 60% of income",
  };
}

export function buildSpending(ctx: EngineContext): SpendingResult {
  const { math, snapshot } = ctx;
  const income = math.effectiveMonthlyIncome;
  const surplus = math.monthlySurplus;
  const highFixed = surplus > 0 && math.fixedShare > HIGH_FIXED_SHARE;

  // Rule set B: savings, Future You earmark, and guilt-free (the rest, floored).
  let savingsMonthly = 0;
  let earmark = 0;
  if (surplus > 0) {
    if (highFixed) {
      savingsMonthly = Math.floor(0.5 * surplus);
    } else if (ctx.studentRules) {
      savingsMonthly = Math.min(Math.floor(0.2 * income), Math.floor(surplus));
    } else {
      savingsMonthly = Math.min(Math.floor(0.1 * income), Math.floor(surplus));
      earmark = Math.min(Math.floor(0.1 * income), Math.floor(surplus) - savingsMonthly);
    }
  }
  const guiltFreeMonthly = surplus > 0 ? Math.max(0, Math.floor(surplus - savingsMonthly - earmark)) : 0;

  // Inside savings: safety cushion first (50/50) until it is met; existing savings count toward it.
  const cushionMet = snapshot.savingsBalance >= ctx.cushionTarget;
  // v3.1 values tilt: security/family top value puts 60% toward the cushion instead of 50%.
  // v3.3 (#107): habits only (no money goal) -> the whole savings share goes to the cushion until it is met.
  const habitsOnly = ctx.moneyGoals.length === 0;
  const emergencyMonthly = cushionMet ? 0 : habitsOnly ? savingsMonthly : Math.floor(savingsMonthly * (ctx.cushionFirst ? 0.6 : 0.5));
  const goalMonthly = savingsMonthly - emergencyMonthly;
  const cushionFillsInMonths =
    !cushionMet && emergencyMonthly > 0 ? monthsToTarget(ctx.cushionTarget, snapshot.savingsBalance, emergencyMonthly) : null;
  const milestoneInMonths =
    emergencyMonthly > 0 && snapshot.savingsBalance < math.monthlyCosts
      ? monthsToTarget(math.monthlyCosts, snapshot.savingsBalance, emergencyMonthly)
      : null;

  // v3.2: habits (everyday banking, credit building) cost time, not money: no allocation row.
  const goals = ctx.moneyGoals;
  const otherGoals = goals.filter((g) => g.id !== "emergency_fund");
  const split = splitByPriority(otherGoals.length ? goalMonthly : 0, otherGoals, goals);

  const allocation: Allocation[] = goals.map((g) => {
    // The emergency-fund goal is the cushion: funded by the emergency bucket, sized by the engine.
    const isEf = g.id === "emergency_fund";
    const monthly = isEf ? emergencyMonthly + (otherGoals.length ? 0 : goalMonthly) : (split.get(g.id) ?? 0);
    const target = isEf ? ctx.cushionTarget : g.targetAmount;
    const requiredMonthly = Math.ceil(target / g.horizonMonths);
    const onTrack = monthly >= requiredMonthly;
    return {
      goalId: g.id,
      monthlyAmount: monthly,
      monthsToTarget: monthsToTarget(target, 0, monthly),
      requiredMonthly,
      onTrack,
      levers: onTrack ? [] : leversFor(target, g.horizonMonths, monthly, requiredMonthly, guiltFreeMonthly, income),
    };
  });

  const pct = (amount: number) => (income > 0 ? Math.min(100, round2((100 * amount) / income)) : 0);
  const fixed = round2(math.monthlyFixedCosts + math.monthlyDebtPayments);
  const noRoom = surplus <= 0;
  const goalNames = otherGoals.length ? otherGoals.map((g) => GOAL_LABELS[g.id]).join(", ") : "your safety cushion";

  const emergencyNote = noRoom
    ? "First we find your breathing room, then this starts growing."
    : cushionMet
      ? habitsOnly
        ? "Your safety cushion is full, so savings stay ready for your next goal."
        : "Your safety cushion is full, so all savings go to your goals."
      : `Builds your safety cushion to ${usd(ctx.cushionTarget)}${cushionFillsInMonths ? ` in about ${timeSpan(cushionFillsInMonths)}` : ""}. ${habitsOnly ? "After that, savings stay ready for your next goal." : "After that, your goals get the full amount."}`;

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
      note: noRoom
        ? "Goals start as soon as there's room."
        : habitsOnly
          ? "Savings, ready for your next goal."
          : `Split across ${goalNames}, by priority.`,
    },
    {
      bucket: "guilt_free",
      monthlyAmount: guiltFreeMonthly,
      percent: pct(guiltFreeMonthly),
      note: noRoom ? "Protected as soon as there's room." : "Money for what you love. Spend it with zero guilt.",
    },
  ];

  return {
    spendingPlan,
    allocation,
    emergencyMonthly,
    goalMonthly,
    savingsMonthly,
    guiltFreeMonthly,
    futureYou: futureYouFor(ctx, earmark, highFixed),
    highFixedCosts: highFixed,
    cushionFillsInMonths,
    milestoneInMonths,
  };
}
