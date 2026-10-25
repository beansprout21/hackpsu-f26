// Overview view model (docs/DASHBOARD.md): a pure function from the engine's plan to what the Overview
// tab shows, in block order. Every string comes from planCopy.ts; every number from the plan/snapshot.
import catalog from "@/data/catalog.json";
import { PERSONA_BY_VALUE } from "@/data/personaTaxonomy";
import type { FinancialSnapshot, GapLever, GoalId, GoalProfile, Match, Plan, Product, Stage } from "@/types";
import * as copy from "./planCopy";

export interface OverviewModel {
  persona: { label: string; tagline: string };
  nextMove: { title: string; detail: string; link?: string }; // plan.stepOne; link only for rule D2
  fnbFit: { productId: string; name: string; line: string } | null; // top `now` match
  month: { toWorkWith: number; sentence: string; bar: { cushion: number; goals: number; guiltFree: number } };
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
  path: { stage: Stage; title: string; detail: string; productId?: string; unlock?: string }[]; // max 3
}

const products = new Map((catalog as unknown as Product[]).map((p) => [p.id, p]));
const productName = (id: string) => products.get(id)?.name ?? id;
const firstSentence = (s: string) => s.trim().split(/(?<=[.!?])\s+/)[0] ?? "";
const bucket = (plan: Plan, id: string) => plan.spendingPlan.find((b) => b.bucket === id)?.monthlyAmount ?? 0;

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

// FNB fit (SPROUT.md v3 rule D): non-customers get the highest-scoring `now` account (plan.matches is
// score-ordered; a free tool can outscore it, but the fit line is about opening an account), else the top
// `now` match; customers get the `now` match serving their P1 goal.
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

export function buildOverview(plan: Plan, profile: GoalProfile, snapshot: FinancialSnapshot): OverviewModel {
  const goals = [...profile.goals].sort((a, b) => a.priority - b.priority);
  const p1 = goals[0];

  // 1. Your next move
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
  const fit = pickFit(plan, snapshot, p1?.id);
  const fnbFit = fit ? { productId: fit.productId, name: productName(fit.productId), line: fitLine(fit, snapshot) } : null;

  // 2. Your month
  const month = {
    toWorkWith: Math.round(plan.monthlySurplus),
    sentence: copy.monthSentence(plan.monthlySurplus),
    bar: { cushion: bucket(plan, "emergency_fund"), goals: bucket(plan, "goal_savings"), guiltFree: bucket(plan, "guilt_free") },
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

  // 4. Your goals: one line each; the lever button only on the P1 goal; never "off track" below P1.
  const goalLines = goals
    .filter((g) => g.id !== "emergency_fund")
    .flatMap((g): OverviewModel["goals"] => {
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
      const laterMatch = plan.matches.find((m) => m.goalId === g.id && m.stage === "later" && m.unlockCondition);
      const unlock = laterMatch?.unlockCondition
        ? copy.withoutWhen(laterMatch.unlockCondition)
        : met
          ? copy.TOP_GOAL_UNLOCK
          : copy.DEFAULT_UNLOCK;
      return [{ goalId: g.id, line: copy.goalLater(g.id, unlock), tone: "later" }];
    });

  // 5. Your path: Now = the FNB fit, Next and Later = the first match of each stage (max 3).
  const pathItem = (m: Match | undefined) =>
    m
      ? [
          {
            stage: m.stage,
            title: productName(m.productId),
            detail: firstSentence(m.explanation),
            productId: m.productId,
            ...(m.stage === "later" && m.unlockCondition ? { unlock: copy.pathUnlock(m.unlockCondition) } : {}),
          },
        ]
      : [];
  const path = [
    ...pathItem(fit),
    ...pathItem(plan.matches.find((m) => m.stage === "next")),
    ...pathItem(plan.matches.find((m) => m.stage === "later")),
  ];

  return { persona, nextMove, fnbFit, month, cushion, goals: goalLines, path };
}
