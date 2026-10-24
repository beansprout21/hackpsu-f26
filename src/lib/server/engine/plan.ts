// Deterministic plan: numbers, stages, triggers, Step one, and template text in Sprout's voice.
// /api/plan (#5) sends this to the AI to reword; on any AI failure it is returned as-is.
import type {
  FinancialSnapshot,
  GoalProfile,
  IncomeFrequency,
  IncomeKind,
  IntakeAnswers,
  LifeStage,
  Match,
  Plan,
  PlanStep,
} from "@/types";
import { getProduct } from "@/lib/server/catalog";
import { buildContext, usd, type EngineContext } from "./context";
import { GOAL_LABELS } from "./defaults";
import { monthsToTarget } from "./math";
import { buildNotYet } from "./notYet";
import { candidateFor, selectMatches, type Candidate } from "./select";
import { buildSpending, type SpendingResult } from "./spending";
import { isMortgageLike } from "./stage";
import { chooseStepOne } from "./stepOne";

export const DISCLAIMER = "Educational prototype. Not financial advice. No data is stored.";
const MAX_STEPS = 8;

const LIFE_STAGE_LABEL: Record<LifeStage, string> = {
  student: "College student",
  new_grad: "New grad",
  young_family: "Young family",
};
const INCOME_LABEL: Record<IncomeKind, string> = {
  job: "job",
  work_study: "work-study",
  family: "family support",
  aid_refund: "aid refund",
  scholarship: "scholarship",
  summer_savings: "summer savings",
  gig: "gig work",
  other: "other income",
};
const FREQ_LABEL: Record<IncomeFrequency, string> = { monthly: "/mo", per_semester: " per semester", one_time: " one-time" };

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const confidenceFor = (score: number): Match["confidence"] => (score >= 85 ? "high" : score >= 70 ? "medium" : "low");

function explain(c: Candidate, ctx: EngineContext): string {
  const goal = ctx.profile.goals.find((g) => g.id === c.goalId);
  const label = GOAL_LABELS[c.goalId];
  const forGoal = goal?.why ? `your ${label} goal (${goal.why})` : `your ${label} goal`;
  const term = c.product.keyTerms[0] ? ` ${c.product.keyTerms[0]}.` : "";
  switch (c.staging.stage) {
    case "now":
      return `${c.product.name} is a starting point for ${forGoal} that you can use right away.${term}`;
    case "next":
      return `Once your first account is open, ${c.product.name} is the natural next move for ${forGoal}.${term}`;
    case "later":
      return `${c.product.name} is on your path for ${forGoal}. It unlocks ${lowerFirst(c.staging.unlockCondition ?? "later")}.`;
  }
}

function toMatch(c: Candidate, ctx: EngineContext): Match {
  return {
    productId: c.product.id,
    goalId: c.goalId,
    stage: c.staging.stage,
    ...(c.staging.unlockCondition ? { unlockCondition: c.staging.unlockCondition } : {}),
    ...(c.staging.unlockTrigger ? { unlockTrigger: c.staging.unlockTrigger } : {}),
    score: c.score,
    breakdown: c.breakdown,
    explanation: explain(c, ctx),
    termsToKnow: c.product.keyTerms.slice(0, 3),
    confidence: confidenceFor(c.score),
    sourceUrl: c.product.sourceUrls[0] ?? "",
  };
}

// Make sure the Step one product shows up as a `now` match (under everyday banking).
function withStepOneMatch(matches: Candidate[], stepOne: PlanStep, ctx: EngineContext): Candidate[] {
  if (!stepOne.productId || matches.some((m) => m.product.id === stepOne.productId)) return matches;
  const product = getProduct(stepOne.productId);
  const c = product ? candidateFor(product, { id: "everyday_banking", priority: 1 }, ctx) : null;
  if (!c) return matches;
  const sameGoal = matches.filter((m) => m.goalId === "everyday_banking");
  if (sameGoal.length >= 2) {
    const weakest = sameGoal.sort((a, b) => a.score - b.score)[0];
    matches = matches.filter((m) => m !== weakest);
  }
  return [...matches, { ...c, staging: { stage: "now" } }];
}

function laterStartMonth(c: Candidate, ctx: EngineContext, spending: SpendingResult): number {
  const t = c.staging.unlockTrigger;
  if (t?.kind === "savings_threshold" && spending.emergencyMonthly > 0) {
    return monthsToTarget(t.amount, ctx.snapshot.savingsBalance, spending.emergencyMonthly);
  }
  return 12;
}

function buildSteps(stepOne: PlanStep, matches: Candidate[], ctx: EngineContext, spending: SpendingResult): PlanStep[] {
  const { snapshot, math } = ctx;
  const allocationFor = (goalId: string) => spending.allocation.find((a) => a.goalId === goalId)?.monthlyAmount;
  const savingsMatch = matches.find((m) => m.product.category === "savings");
  const rest = matches.filter((m) => m.product.id !== stepOne.productId);

  const now: Omit<PlanStep, "order">[] = [stepOne];
  if (stepOne.kind !== "budget") {
    now.push({
      stage: "now",
      kind: "budget",
      title: "Set your spending plan",
      detail:
        math.monthlySurplus > 0
          ? `${usd(math.monthlyFixedCosts + math.monthlyDebtPayments)} bills, ${usd(spending.emergencyMonthly)} cushion, ${usd(spending.goalMonthly)} goals, ${usd(spending.guiltFreeMonthly)} guilt-free. Every dollar has a job.`
          : "List every bill and expense so we can find your breathing room.",
      startMonth: 0,
    });
  }
  if (!snapshot.hasSteadyIncome && math.monthlySurplus > 0) {
    now.push({
      stage: "now",
      kind: "habit",
      title: "Split each deposit into your buckets the day it lands",
      detail: "When an aid refund or family money arrives, move the cushion, goal, and fun amounts right away.",
      startMonth: 0,
    });
  }
  if (spending.emergencyMonthly > 0) {
    now.push({
      stage: "now",
      kind: "save",
      title: `Auto-save ${usd(spending.emergencyMonthly)} a month to your cushion`,
      detail: `Automate it so saving happens before spending. Target: ${usd(ctx.cushionTarget)} first.`,
      startMonth: 0,
      ...(savingsMatch ? { productId: savingsMatch.product.id } : {}),
      monthlyAmount: spending.emergencyMonthly,
    });
  }
  for (const m of rest.filter((m) => m.staging.stage === "now")) {
    const learn = m.product.category === "education_tool";
    now.push({
      stage: "now",
      kind: learn ? "learn" : "open",
      title: `${learn ? "Explore" : "Open"} ${m.product.name}`,
      detail: m.product.keyTerms[0] ?? "",
      startMonth: 0,
      productId: m.product.id,
    });
  }

  const next: Omit<PlanStep, "order">[] = rest
    .filter((m) => m.staging.stage === "next")
    .map((m): Omit<PlanStep, "order"> => {
      const monthly = allocationFor(m.goalId);
      return {
        stage: "next",
        kind: isMortgageLike(m.product) ? "talk_to_banker" : "open",
        title: `Open ${m.product.name} for your ${GOAL_LABELS[m.goalId]} goal`,
        detail: monthly ? `Then move ${usd(monthly)} a month into it automatically.` : (m.product.keyTerms[0] ?? ""),
        startMonth: 1,
        productId: m.product.id,
        ...(monthly ? { monthlyAmount: monthly } : {}),
      };
    });

  const later: Omit<PlanStep, "order">[] = rest
    .filter((m) => m.staging.stage === "later")
    .map((m): Omit<PlanStep, "order"> => ({
      stage: "later",
      kind: isMortgageLike(m.product) ? "talk_to_banker" : "open",
      title: isMortgageLike(m.product)
        ? `Talk to an FNB banker about ${m.product.name}`
        : `Unlock ${m.product.name}`,
      detail: m.staging.unlockCondition ?? "",
      startMonth: laterStartMonth(m, ctx, spending),
      productId: m.product.id,
    }));
  later.sort((a, b) => a.startMonth - b.startMonth);

  const nextCap = Math.min(next.length, 2);
  const laterCap = Math.min(later.length, MAX_STEPS - Math.min(now.length, 3) - nextCap);
  const nowCap = MAX_STEPS - nextCap - laterCap;
  return [...now.slice(0, nowCap), ...next.slice(0, nextCap), ...later.slice(0, laterCap)].map((s, i) => ({
    ...s,
    order: i + 1,
  }));
}

function bankerSummary(ctx: EngineContext, matches: Candidate[]): string {
  const { snapshot, math, profile, intake } = ctx;
  const income = snapshot.incomeSources.length
    ? snapshot.incomeSources.map((s) => `${usd(s.amount)}${FREQ_LABEL[s.frequency]} ${INCOME_LABEL[s.kind]}`).join(", ")
    : "no income sources listed";
  const goals = [...profile.goals]
    .sort((a, b) => a.priority - b.priority)
    .map((g) => `${GOAL_LABELS[g.id]} (${usd(g.targetAmount)}${g.targetIsEstimate ? " est." : ""} in ${g.horizonMonths} months, P${g.priority})`)
    .join("; ");
  const names = (stage: string) =>
    matches.filter((m) => m.staging.stage === stage).map((m) => m.product.name).join(", ") || "none";
  return [
    `${LIFE_STAGE_LABEL[intake.lifeStage]}, ${snapshot.isFnbCustomer ? "existing FNB customer" : "not yet an FNB customer"}, ${snapshot.hasSteadyIncome ? "steady income" : "no steady income"}.`,
    `Income: ${income} = about ${usd(math.effectiveMonthlyIncome)}/mo effective. Fixed costs ${usd(math.monthlyFixedCosts)}, debt payments ${usd(math.monthlyDebtPayments)}, surplus ${usd(math.monthlySurplus)}/mo, savings ${usd(snapshot.savingsBalance)}, credit range: ${snapshot.creditBand}.`,
    `Goals: ${goals}.`,
    `Plan: now ${names("now")}; next ${names("next")}; later ${names("later")}.`,
  ].join(" ");
}

export function buildPlanSkeleton(profile: GoalProfile, snapshot: FinancialSnapshot, intake: IntakeAnswers): Plan {
  const ctx = buildContext(profile, snapshot, intake);
  const spending = buildSpending(ctx);
  const selected = selectMatches(ctx);
  const stepOne = chooseStepOne(ctx, selected);
  const matches = withStepOneMatch(selected, stepOne, ctx).sort((a, b) => b.score - a.score);
  const { math } = ctx;
  const p1 = [...profile.goals].sort((a, b) => a.priority - b.priority)[0];

  const headline =
    math.monthlySurplus > 0
      ? profile.goals.length > 1 && p1
        ? `Step one this week, then ${usd(spending.goalMonthly)} a month toward your goals, starting with ${GOAL_LABELS[p1.id]}`
        : `Step one this week, then ${usd(spending.goalMonthly)} a month toward your ${p1 ? GOAL_LABELS[p1.id] : ""} goal`
      : "First, let's find your breathing room";
  const sproutSays =
    math.monthlySurplus > 0
      ? `You have ${usd(math.monthlySurplus)} a month of breathing room, and that's a real start. Let's give every dollar a job, beginning with one easy step this week.`
      : "Right now your costs use up all of your income, and that's okay. First we find your breathing room, starting with one free step this week.";

  return {
    headline,
    sproutSays,
    stepOne,
    effectiveMonthlyIncome: math.effectiveMonthlyIncome,
    monthlySurplus: math.monthlySurplus,
    spendingPlan: spending.spendingPlan,
    emergencyFundTarget: math.fullCushion,
    allocation: spending.allocation,
    matches: matches.map((c) => toMatch(c, ctx)),
    steps: buildSteps(stepOne, matches, ctx, spending),
    notYet: buildNotYet(ctx, matches),
    bankerSummary: bankerSummary(ctx, matches),
    aiUsed: false,
    disclaimer: DISCLAIMER,
  };
}
