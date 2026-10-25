// Deterministic plan (docs/SPROUT.md v2): numbers, stages, triggers, levers, Step one, and
// template text in Sprout's voice. /api/plan sends this to the AI to reword; on any AI failure
// it is returned as-is.
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
import { feeNote, termsWithFee } from "./fees";
import { monthsToTarget } from "./math";
import { buildNotYet } from "./notYet";
import { topValueGoal } from "./score";
import { candidateFor, selectMatches, type Candidate } from "./select";
import { buildSpending, type SpendingResult } from "./spending";
import { isMortgageLike } from "./stage";
import { chooseStepOne } from "./stepOne";

export const DISCLAIMER = "Educational prototype. Not financial advice. Nothing is stored unless you choose to share it with FNB.";
const MAX_STEPS = 8;
const ACCOUNT_CATEGORIES = ["checking", "savings", "cd", "credit_card", "small_business"];

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
  const fee = ACCOUNT_CATEGORIES.includes(c.product.category) ? feeNote(c.product, ctx) : null;
  const tail = fee ? ` ${fee}.` : c.product.keyTerms[0] ? ` ${c.product.keyTerms[0]}.` : "";
  if (!goal && c.staging.stage === "now") {
    // Foundation items (Step one checking, free student tools) aren't tied to a goal the user picked.
    if (c.product.category === "education_tool") return `${c.product.name} is a free head start you can use right away.${tail}`;
    if (c.product.category === "savings") return `${c.product.name} is where your cushion grows, and you can start right away.${tail}`;
    return `${c.product.name} is your everyday home base, and you can start right away.${tail}`;
  }
  switch (c.staging.stage) {
    case "now":
      return `${c.product.name} fits ${forGoal}, and you can start right away.${tail}`;
    case "next":
      return `Once your first account is open, ${c.product.name} is the natural next move for ${forGoal}.${tail}`;
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
    termsToKnow: termsWithFee(c.product, ctx),
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

// Rule set E: students always get the free education foundation (Learning Center, scholarship
// entry) as `now` items when they're in the catalog and not already matched.
const STUDENT_FOUNDATION = ["learning-center", "fnb-student-scholarship"];

function withStudentFoundation(matches: Candidate[], ctx: EngineContext): Candidate[] {
  if (!ctx.isStudent) return matches;
  const out = [...matches];
  for (const id of STUDENT_FOUNDATION) {
    if (out.some((m) => m.product.id === id)) continue;
    if (out.filter((m) => m.goalId === "education").length >= 2) break;
    const product = getProduct(id);
    const c = product ? candidateFor(product, { id: "education", priority: 3 }, ctx) : null;
    if (c && c.staging.stage === "now") out.push(c);
  }
  return out;
}

// Rule set E: the target cushion is foundational, so while it isn't met the plan always shows
// the account it grows in (FirstRate Savings, FNB's companion to Student Checking).
const CUSHION_ACCOUNT = "firstrate-savings";

function withCushionAccount(matches: Candidate[], ctx: EngineContext): Candidate[] {
  if (ctx.snapshot.savingsBalance >= ctx.cushionTarget) return matches;
  if (matches.some((m) => m.product.category === "savings")) return matches;
  const product = getProduct(CUSHION_ACCOUNT);
  const c = product ? candidateFor(product, { id: "emergency_fund", priority: 2 }, ctx) : null;
  return c && c.staging.stage === "now" ? [...matches, c] : matches;
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
  const room = math.monthlySurplus > 0;

  const now: Omit<PlanStep, "order">[] = [stepOne];
  // Rule set E: the automate habit is always present.
  if (stepOne.kind !== "habit") {
    now.push({
      stage: "now",
      kind: "habit",
      title: snapshot.hasSteadyIncome ? "Automate it on payday" : "Automate it the day money arrives",
      detail: room
        ? `Move ${usd(spending.savingsMonthly)} to savings first: ${usd(spending.emergencyMonthly)} to your cushion, ${usd(spending.goalMonthly)} to your goals.`
        : "Once there's breathing room, a small automatic transfer does the saving for you.",
      startMonth: 0,
      ...(savingsMatch ? { productId: savingsMatch.product.id } : {}),
      ...(spending.savingsMonthly > 0 ? { monthlyAmount: spending.savingsMonthly } : {}),
    });
  }
  if (stepOne.kind !== "budget") {
    now.push({
      stage: "now",
      kind: "budget",
      title: "Set your spending plan",
      detail: room
        ? `${usd(math.monthlyFixedCosts + math.monthlyDebtPayments)} bills, ${usd(spending.savingsMonthly)} savings, ${usd(spending.guiltFreeMonthly)} guilt-free. Every dollar has a job.`
        : "List every bill and expense so we can find your breathing room.",
      startMonth: 0,
    });
  }
  if (spending.highFixedCosts) {
    now.push({
      stage: "now",
      kind: "budget",
      title: "Big Win: review your biggest fixed cost",
      detail: `Bills take ${Math.round(math.fixedShare * 100)}% of your income. Housing, car, or phone is where one change frees the most money.`,
      startMonth: 0,
    });
  }
  for (const m of rest.filter((m) => m.staging.stage === "now")) {
    const learn = m.product.category === "education_tool";
    now.push({
      stage: "now",
      kind: learn ? "learn" : "open",
      title: `${learn ? "Explore" : "Open"} ${m.product.name}`,
      detail: (ACCOUNT_CATEGORIES.includes(m.product.category) ? feeNote(m.product, ctx) : null) ?? m.product.keyTerms[0] ?? "",
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
      title: isMortgageLike(m.product) ? `Talk to an FNB banker about ${m.product.name}` : `Unlock ${m.product.name}`,
      detail: m.staging.unlockCondition ?? "",
      startMonth: laterStartMonth(m, ctx, spending),
      productId: m.product.id,
    }));
  later.sort((a, b) => a.startMonth - b.startMonth);

  const nextCap = Math.min(next.length, 2);
  const laterCap = Math.min(later.length, 2, MAX_STEPS - Math.min(now.length, 4) - nextCap);
  const nowCap = MAX_STEPS - nextCap - laterCap;
  return [...now.slice(0, nowCap), ...next.slice(0, nextCap), ...later.slice(0, laterCap)].map((s, i) => ({
    ...s,
    order: i + 1,
  }));
}

function bankerSummary(ctx: EngineContext, matches: Candidate[], spending: SpendingResult): string {
  const { snapshot, math, profile, intake } = ctx;
  const income = snapshot.incomeSources.length
    ? snapshot.incomeSources.map((s) => `${usd(s.amount)}${FREQ_LABEL[s.frequency]} ${INCOME_LABEL[s.kind]}`).join(", ")
    : "no income sources listed";
  const goals = [...profile.goals]
    .sort((a, b) => a.priority - b.priority)
    .map((g) => {
      const a = spending.allocation.find((x) => x.goalId === g.id);
      const status = a ? (a.onTrack ? "on track" : `${usd(a.monthlyAmount)}/mo of ${usd(a.requiredMonthly)}/mo needed`) : "";
      return `${GOAL_LABELS[g.id]} (${usd(g.targetAmount)}${g.targetIsEstimate ? " est." : ""} in ${g.horizonMonths} months, P${g.priority}${status ? `, ${status}` : ""})`;
    })
    .join("; ");
  const names = (stage: string) =>
    matches.filter((m) => m.staging.stage === stage).map((m) => m.product.name).join(", ") || "none";
  return [
    `${LIFE_STAGE_LABEL[intake.lifeStage]}, ${snapshot.isFnbCustomer ? "existing FNB customer" : "not yet an FNB customer"}, ${snapshot.hasSteadyIncome ? "steady income" : "no steady income"}.`,
    `Income: ${income} = about ${usd(math.effectiveMonthlyIncome)}/mo effective. Fixed costs ${usd(math.monthlyFixedCosts)}, debt payments ${usd(math.monthlyDebtPayments)} (${Math.round(math.fixedShare * 100)}% of income), surplus ${usd(math.monthlySurplus)}/mo, savings ${usd(snapshot.savingsBalance)}, credit range: ${snapshot.creditBand}.`,
    `Spending plan: ${usd(spending.savingsMonthly)}/mo savings, ${usd(spending.guiltFreeMonthly)}/mo guilt-free${spending.futureYou.earmarkMonthly ? `, ${usd(spending.futureYou.earmarkMonthly)}/mo Future You (advisor handoff)` : ""}.`,
    `Goals: ${goals}.`,
    `Plan: now ${names("now")}; next ${names("next")}; later ${names("later")}.`,
  ].join(" ");
}

function sproutSaysFor(ctx: EngineContext, spending: SpendingResult): string {
  const { math } = ctx;
  if (math.monthlySurplus <= 0) {
    return "Right now your costs use up all of your income, and that's okay. First we find your breathing room, starting with one free step this week.";
  }
  // Lever wording: lead with the top-value goal's turn-up-the-dial lever when there is one.
  const focus = topValueGoal(ctx);
  const a = focus ? spending.allocation.find((x) => x.goalId === focus) : undefined;
  const dial = a?.levers.find((l) => l.kind === "turn_up_dial");
  const first =
    dial && dial.kind === "turn_up_dial" && focus
      ? `Your ${GOAL_LABELS[focus]} goal is ${usd(dial.moveFromGuiltFree)} a month away, and your guilt-free money can turn up that dial.`
      : `You have ${usd(math.monthlySurplus)} a month of breathing room, and that's a real start.`;
  const second = spending.cushionFillsInMonths
    ? `${usd(spending.emergencyMonthly)} a month fills your cushion in ${spending.cushionFillsInMonths} months, then your goals get the full amount.`
    : "Let's give every dollar a job, beginning with one easy step this week.";
  return `${first} ${second}`;
}

export function buildPlanSkeleton(profile: GoalProfile, snapshot: FinancialSnapshot, intake: IntakeAnswers): Plan {
  const ctx = buildContext(profile, snapshot, intake);
  const spending = buildSpending(ctx);
  const selected = selectMatches(ctx);
  const stepOne = chooseStepOne(ctx, selected);
  const matches = withCushionAccount(withStudentFoundation(withStepOneMatch(selected, stepOne, ctx), ctx), ctx).sort(
    (a, b) => b.score - a.score,
  );
  const { math } = ctx;
  const p1 = [...profile.goals].sort((a, b) => a.priority - b.priority)[0];

  const headline =
    math.monthlySurplus > 0
      ? profile.goals.length > 1 && p1
        ? `Step one this week, then ${usd(spending.goalMonthly)} a month toward your goals, starting with ${GOAL_LABELS[p1.id]}`
        : `Step one this week, then ${usd(spending.goalMonthly)} a month toward your ${p1 ? GOAL_LABELS[p1.id] : ""} goal`
      : "First, let's find your breathing room";

  return {
    headline,
    sproutSays: sproutSaysFor(ctx, spending),
    stepOne,
    effectiveMonthlyIncome: math.effectiveMonthlyIncome,
    monthlySurplus: math.monthlySurplus,
    spendingPlan: spending.spendingPlan,
    fixedShare: math.fixedShare,
    cushionTarget: ctx.cushionTarget,
    cushionFillsInMonths: spending.cushionFillsInMonths,
    futureYou: spending.futureYou,
    emergencyFundTarget: math.fullCushion,
    allocation: spending.allocation,
    matches: matches.map((c) => toMatch(c, ctx)),
    steps: buildSteps(stepOne, matches, ctx, spending),
    notYet: buildNotYet(ctx, matches),
    bankerSummary: bankerSummary(ctx, matches, spending),
    aiUsed: false,
    disclaimer: DISCLAIMER,
  };
}
