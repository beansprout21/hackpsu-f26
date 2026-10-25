// Overview view model (docs/DASHBOARD.md v2): a pure function from the engine's plan to what the Overview
// tab shows, in block order. Every string comes from planCopy.ts; every number from the plan/snapshot.
import catalog from "@/data/catalog.json";
import { PERSONA_BY_VALUE } from "@/data/personaTaxonomy";
import type { FinancialSnapshot, GapLever, GoalId, GoalProfile, Match, Plan, Product, Stage } from "@/types";
import * as copy from "./planCopy";

export interface OverviewStep {
  n: number; // 1-based position in the guide
  kind: "move" | "product" | "habit";
  stage: Stage;
  title: string;
  detail: string; // product steps: first sentence of the explanation (<= 20 words)
  productId?: string;
  feeLine?: string; // product steps: the fee line (fee and how this user avoids it)
  url?: string; // product steps: catalog URL ("See it at FNB"); credit-report steps: annualcreditreport.com
  unlock?: string; // `later` product steps: "Unlocks when ..."
  askSprout?: string; // the question this step's chip asks ("Why this first?", "Why this account?")
}

export interface OverviewModel {
  persona: { label: string; tagline: string };
  nextMove: { title: string; detail: string; link?: string }; // plan.stepOne; link only for rule D2
  month: {
    income: number;
    fixed: number; // fixed costs + debt payments
    toWorkWith: number;
    sentence: string;
    bar: { fixed: number; cushion: number; goals: number; guiltFree: number };
  };
  cushion: {
    target: number;
    saved: number;
    pct: number;
    milestone: number;
    milestoneInMonths: number | null;
    fullInMonths: number | null;
    met: boolean;
    title: string;
    reason: string;
    progressLine: string;
    note: string;
  };
  goals: {
    goalId: GoalId;
    line: string;
    tone: "gap" | "on_track" | "on_path" | "later";
    lever?: { label: string; askSprout: string };
  }[];
  // v2: the numbered guide; Overview shows the first 4 (overviewSteps), Roadmap the full list. Replaces fnbFit + path.
  steps: OverviewStep[];
  /** @deprecated v1 field kept until #95 renders `steps` (it equals step 2's product). Remove with the v1 Overview. */
  fnbFit: { productId: string; name: string; line: string } | null;
  /** @deprecated v1 field kept until #95 renders `steps` (the product steps). Remove with the v1 Overview. */
  path: { stage: Stage; title: string; detail: string; productId?: string; unlock?: string }[];
}

const HABITS: GoalId[] = ["everyday_banking", "credit_building"]; // SPROUT.md v3.2: cost time, not money
const isHabit = (id: GoalId) => HABITS.includes(id);
const OVERVIEW_STEPS = 4;

const products = new Map((catalog as unknown as Product[]).map((p) => [p.id, p]));
const productName = (id: string) => products.get(id)?.name ?? id;
const firstSentence = (s: string) => s.trim().split(/(?<=[.!?])\s+/)[0] ?? "";
const bucket = (plan: Plan, id: string) => plan.spendingPlan.find((b) => b.bucket === id)?.monthlyAmount ?? 0;
// "FNB SmartSecured Credit Card" -> "SmartSecured card" (same rule as chatCopy's productShortName).
const shortName = (id: string) =>
  productName(id).replace(/^FNB\s+/, "").replace(/\s*\(.*\)\s*$/, "").replace(/\bCredit Card$/, "card");

// ceil((target - saved) / monthly); null when already reached or nothing is going in.
function monthsUntil(target: number, saved: number, monthly: number): number | null {
  if (saved >= target || monthly <= 0) return null;
  return Math.ceil((target - saved) / monthly);
}

function leverCopy(goalId: GoalId, lever: GapLever) {
  switch (lever.kind) {
    case "turn_up_dial":
      return copy.leverTurnUpDial(goalId, lever.moveFromGuiltFree);
    case "more_time":
      return copy.leverMoreTime(goalId, lever.newHorizonMonths);
    case "smaller_target":
      return copy.leverSmallerTarget(goalId, lever.reachableAmount);
  }
}

// P1 lever button (DASHBOARD.md v3.1 order): turn_up_dial; else more_time only if <= 60 months;
// else smaller_target; else the Big Win button when the plan has the Big Win step; else none.
function pickLever(goalId: GoalId, levers: GapLever[], plan: Plan): { label: string; askSprout: string } | undefined {
  const dial = levers.find((l) => l.kind === "turn_up_dial");
  if (dial) return leverCopy(goalId, dial);
  const time = levers.find((l) => l.kind === "more_time" && l.newHorizonMonths <= copy.MORE_TIME_MAX_MONTHS);
  if (time) return leverCopy(goalId, time);
  const smaller = levers.find((l) => l.kind === "smaller_target");
  if (smaller) return leverCopy(goalId, smaller);
  if (plan.steps.some((s) => /^Big Win/i.test(s.title))) return copy.LEVER_BIG_WIN;
  return undefined;
}

const ACCOUNT_CATEGORIES: Product["category"][] = ["checking", "savings", "cd", "credit_card", "small_business"];
const isAccount = (m: Match) => ACCOUNT_CATEGORIES.includes(products.get(m.productId)?.category ?? "education_tool");

// The FNB account that holds Step one (SPROUT.md rule D "FNB fit"): non-customers get the highest-scoring
// `now` account (plan.matches is score-ordered; a free tool can outscore it), else the top `now` match;
// customers get the `now` match serving their P1 money goal.
function pickFit(plan: Plan, snapshot: FinancialSnapshot, p1?: GoalId): Match | undefined {
  const now = plan.matches.filter((m) => m.stage === "now");
  if (snapshot.isFnbCustomer && p1) return now.find((m) => m.goalId === p1) ?? now[0];
  return now.find(isAccount) ?? now[0];
}

function fitLine(m: Match, snapshot: FinancialSnapshot): string {
  const p = products.get(m.productId);
  const fee = m.termsToKnow[0];
  if (snapshot.isFnbCustomer || !p || !fee || !isAccount(m)) return firstSentence(m.explanation);
  const line = copy.fnbFitLine(p.name, p.category, fee);
  return m.productId === "student-checking" ? `${line} ${copy.HUB_BRANCH}` : line;
}

// A product step: name, one-sentence why, fee line, catalog link, and its Ask Sprout question.
function productStep(m: Match, title: string): Omit<OverviewStep, "n"> {
  const p = products.get(m.productId);
  const fee = isAccount(m) ? m.termsToKnow[0] : undefined;
  return {
    kind: "product",
    stage: m.stage,
    title,
    detail: firstSentence(m.explanation),
    productId: m.productId,
    ...(fee ? { feeLine: fee } : {}),
    ...(p?.sourceUrls[0] ? { url: p.sourceUrls[0] } : {}),
    ...(m.stage === "later" && m.unlockCondition ? { unlock: copy.pathUnlock(m.unlockCondition) } : {}),
    askSprout: isAccount(m) ? copy.WHY_THIS_ACCOUNT : copy.whyThisProduct(shortName(m.productId)),
  };
}

export function buildOverview(plan: Plan, profile: GoalProfile, snapshot: FinancialSnapshot): OverviewModel {
  const goals = [...profile.goals].sort((a, b) => a.priority - b.priority);
  const p1 = goals.find((g) => !isHabit(g.id)); // v3.2: P1 = the top money goal; habits are never P1

  // Persona + Step one
  const persona = {
    label: profile.persona.label,
    tagline: Object.values(PERSONA_BY_VALUE).find((d) => d.id === profile.persona.id)?.tagline ?? profile.persona.description,
  };
  const isCreditReport = plan.stepOne.kind === "learn" && plan.stepOne.detail.includes("annualcreditreport.com");
  const nextMove = {
    title: plan.stepOne.title,
    detail: plan.stepOne.detail,
    ...(isCreditReport ? { link: copy.CREDIT_REPORT_URL } : {}),
  };

  // 1. Your step-by-step plan: Step one, the FNB account that holds it, the next product, what unlocks later.
  // Habit steps fill a missing product slot, then follow in priority order (never repeating Step one).
  const fit = pickFit(plan, snapshot, p1?.id);
  const nextMatch = plan.matches.find((m) => m.stage === "next");
  const laterMatch = plan.matches.find((m) => m.stage === "later");
  const habitQueue = goals
    .filter((g) => isHabit(g.id))
    .map((g) => copy.HABIT_STEP[g.id])
    .filter((h): h is NonNullable<typeof h> => !!h && h.detail !== plan.stepOne.detail)
    .map((h): Omit<OverviewStep, "n"> => ({ kind: "habit", stage: "now", title: h.title, detail: h.detail, ...(h.url ? { url: h.url } : {}) }));
  const fitTitle = (m: Match) =>
    snapshot.isFnbCustomer && p1 ? copy.stepUseFor(productName(m.productId), p1.id) : copy.stepOpenToHold(productName(m.productId));
  const moveStep: Omit<OverviewStep, "n"> = {
    kind: "move",
    stage: "now",
    title: nextMove.title,
    detail: nextMove.detail,
    ...(nextMove.link ? { url: nextMove.link } : {}),
    askSprout: copy.WHY_THIS_FIRST,
  };
  const ordered: (Omit<OverviewStep, "n"> | undefined)[] = [
    moveStep,
    fit ? productStep(fit, fitTitle(fit)) : habitQueue.shift(),
    nextMatch ? productStep(nextMatch, copy.stepOpenFor(productName(nextMatch.productId), nextMatch.goalId)) : habitQueue.shift(),
    laterMatch ? productStep(laterMatch, copy.stepUnlock(productName(laterMatch.productId))) : habitQueue.shift(),
    ...habitQueue,
  ];
  const steps = ordered.filter((s): s is Omit<OverviewStep, "n"> => !!s).map((s, i) => ({ n: i + 1, ...s }));

  // 2. Your month (v2: income, fixed costs, and a 4-part bar)
  const income = Math.round(plan.effectiveMonthlyIncome);
  const fixed = Math.round(bucket(plan, "fixed_costs"));
  const month = {
    income,
    fixed,
    toWorkWith: Math.round(plan.monthlySurplus),
    sentence: copy.monthSentence(income, fixed, plan.monthlySurplus),
    bar: {
      fixed,
      cushion: bucket(plan, "emergency_fund"),
      goals: bucket(plan, "goal_savings"),
      guiltFree: bucket(plan, "guilt_free"),
    },
  };

  // 3. Your safety cushion (savings count toward it; milestone = 1 month of fixed + debt)
  const target = plan.cushionTarget;
  const saved = Math.min(snapshot.savingsBalance, target);
  const met = snapshot.savingsBalance >= target;
  const milestone = snapshot.monthlyFixedCosts + snapshot.monthlyDebtPayments;
  const cushionMonthly = bucket(plan, "emergency_fund");
  const milestoneInMonths = met ? null : monthsUntil(milestone, snapshot.savingsBalance, cushionMonthly);
  const fullInMonths = met ? null : plan.cushionFillsInMonths;
  const cushion = {
    target,
    saved,
    pct: target > 0 ? Math.round((100 * saved) / target) : 100,
    milestone,
    milestoneInMonths,
    fullInMonths,
    met,
    title: copy.cushionTitle(target),
    reason: copy.CUSHION_REASON,
    progressLine: met ? copy.CUSHION_MET : copy.cushionProgress(saved, target, milestoneInMonths, fullInMonths),
    note: copy.CUSHION_NOTE,
  };

  // 4. Your goals: one line per goal id (never the safety cushion); habits cost time, not money; the lever
  // button only on the P1 money goal; never "off track" below P1.
  const seen = new Set<GoalId>();
  const goalLines = goals
    .filter((g) => {
      if (g.id === "emergency_fund" || seen.has(g.id)) return false;
      seen.add(g.id);
      return true;
    })
    .flatMap((g): OverviewModel["goals"] => {
      if (isHabit(g.id)) {
        const line = copy.HABIT_LINE[g.id];
        return line ? [{ goalId: g.id, line, tone: "on_path" }] : [];
      }
      const a = plan.allocation.find((x) => x.goalId === g.id);
      if (!a) return [];
      if (g.id === p1?.id) {
        if (a.onTrack) return [{ goalId: g.id, line: copy.goalOnTrack(g.id, a.monthlyAmount), tone: "on_track" }];
        const lever = pickLever(g.id, a.levers, plan);
        return [
          {
            goalId: g.id,
            line: copy.goalGap(g.id, a.requiredMonthly - a.monthlyAmount),
            tone: "gap",
            ...(lever ? { lever } : {}),
          },
        ];
      }
      // v3.1: money going in says so; the pace only when it's within 2 x horizon.
      if (a.monthlyAmount > 0) {
        const pace = a.monthsToTarget <= 2 * g.horizonMonths ? a.monthsToTarget : null;
        return [{ goalId: g.id, line: copy.goalGoingIn(g.id, a.monthlyAmount, pace), tone: "on_path" }];
      }
      // $0 going in: the later match's unlock; else the cushion, if it isn't full yet; else the top goal.
      const goalLater = plan.matches.find((m) => m.goalId === g.id && m.stage === "later" && m.unlockCondition);
      const unlock = goalLater?.unlockCondition
        ? copy.withoutWhen(goalLater.unlockCondition)
        : met
          ? copy.TOP_GOAL_UNLOCK
          : copy.DEFAULT_UNLOCK;
      return [{ goalId: g.id, line: copy.goalLater(g.id, unlock), tone: "later" }];
    });

  // Deprecated v1 fields (until #95 renders `steps`): the FNB fit and the 3 product steps as a path.
  const fnbFit = fit ? { productId: fit.productId, name: productName(fit.productId), line: fitLine(fit, snapshot) } : null;
  const path = [fit, nextMatch, laterMatch]
    .filter((m): m is Match => !!m)
    .map((m) => ({
      stage: m.stage,
      title: productName(m.productId),
      detail: firstSentence(m.explanation),
      productId: m.productId,
      ...(m.stage === "later" && m.unlockCondition ? { unlock: copy.pathUnlock(m.unlockCondition) } : {}),
    }));

  return { persona, nextMove, month, cushion, goals: goalLines, steps, fnbFit, path };
}

// The Overview shows the first 4 steps; the Roadmap tab shows them all.
export const overviewSteps = (model: OverviewModel) => model.steps.slice(0, OVERVIEW_STEPS);
