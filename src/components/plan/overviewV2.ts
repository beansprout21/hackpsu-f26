// TEMPORARY (#95): the OverviewModel v2 shape from docs/DASHBOARD.md and an adapter from today's model, so the
// dashboard UI can be built before #94 (engine v3.2 + Overview model v2) merges. Delete this file once
// buildOverview() returns v2 and planCopy.ts has the v2 labels.
import catalog from "@/data/catalog.json";
import type { OverviewModel } from "@/lib/client/overview";
import * as copy from "@/lib/client/planCopy";
import type { FinancialSnapshot, GoalId, GoalProfile, Match, Plan, Product, Stage } from "@/types";

export type GuideStep = {
  n: number;
  kind: "move" | "product" | "habit";
  stage: Stage;
  title: string;
  detail: string;
  productId?: string;
  feeLine?: string;
  url?: string;
  unlock?: string;
  askSprout?: string;
};

export interface OverviewModelV2 {
  persona: { label: string; tagline: string };
  nextMove: { title: string; detail: string; link?: string };
  month: {
    income: number;
    fixed: number;
    toWorkWith: number;
    sentence: string;
    bar: { fixed: number; cushion: number; goals: number; guiltFree: number };
  };
  cushion: OverviewModel["cushion"];
  goals: OverviewModel["goals"];
  steps: GuideStep[]; // max 4 on Overview, full list on Roadmap
}

// v2 labels (DASHBOARD.md v2, #95) until planCopy.ts carries them.
export const V2_COPY = {
  guideTitle: "Your step-by-step plan",
  seeAtFnb: "See it at FNB",
  whyAccount: "Why this account?",
  barFixed: "Fixed costs",
  stageHeadings: { now: "Start now", next: "Next", later: "Unlocks later" } as Record<Stage, string>,
};

const products = new Map((catalog as unknown as Product[]).map((p) => [p.id, p]));
const name = (id: string) => products.get(id)?.name ?? id;
const firstSentence = (s: string) => s.trim().split(/(?<=[.!?])\s+/)[0] ?? "";
const bucket = (plan: Plan, id: string) => plan.spendingPlan.find((b) => b.bucket === id)?.monthlyAmount ?? 0;
const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

export const OVERVIEW_STEPS = 4;

export function toOverviewV2(v1: OverviewModel, plan: Plan, profile: GoalProfile, snapshot: FinancialSnapshot): OverviewModelV2 {
  const income = Math.round(plan.effectiveMonthlyIncome);
  const fixed = bucket(plan, "fixed_costs");
  const sentence =
    plan.monthlySurplus > 0
      ? `Your ${usd(income)} a month: ${usd(fixed)} for fixed costs, ${usd(plan.monthlySurplus)} to work with.`
      : v1.month.sentence;

  const p1 = [...profile.goals].sort((a, b) => a.priority - b.priority)[0]?.id as GoalId | undefined;
  const fit = v1.fnbFit ? plan.matches.find((m) => m.productId === v1.fnbFit!.productId) : undefined;
  const next = plan.matches.find((m) => m.stage === "next");
  const later = plan.matches.find((m) => m.stage === "later");

  const productStep = (m: Match, title: string): Omit<GuideStep, "n"> => ({
    kind: "product",
    stage: m.stage,
    title,
    detail: firstSentence(m.explanation),
    productId: m.productId,
    feeLine: m.termsToKnow[0],
    url: m.sourceUrl,
    ...(m.stage === "later" && m.unlockCondition ? { unlock: copy.pathUnlock(m.unlockCondition) } : {}),
  });

  const guide: Omit<GuideStep, "n">[] = [
    { kind: "move", stage: "now", title: plan.stepOne.title, detail: plan.stepOne.detail },
    ...(fit
      ? [productStep(fit, snapshot.isFnbCustomer && p1 ? `Use ${name(fit.productId)} for your ${copy.FUND_NAME[p1]}` : `Open ${name(fit.productId)} to hold it`)]
      : []),
    ...(next ? [productStep(next, name(next.productId))] : []),
    ...(later ? [productStep(later, name(later.productId))] : []),
  ];
  // Full list for the Roadmap: the rest of the plan's steps, then products not yet in the guide.
  const inGuide = new Set(guide.flatMap((s) => (s.productId ? [s.productId] : [])));
  const restSteps = plan.steps
    .filter((s) => !(s.order === plan.stepOne.order && s.title === plan.stepOne.title))
    .filter((s) => !s.productId || !inGuide.has(s.productId))
    .map((s): Omit<GuideStep, "n"> => {
      const m = s.productId ? plan.matches.find((x) => x.productId === s.productId) : undefined;
      if (m) inGuide.add(m.productId);
      return m ? productStep(m, s.title) : { kind: "habit", stage: s.stage, title: s.title, detail: s.detail };
    });
  const order: Record<Stage, number> = { now: 0, next: 1, later: 2 };
  const rest = restSteps.sort((a, b) => order[a.stage] - order[b.stage]);

  return {
    persona: v1.persona,
    nextMove: v1.nextMove,
    month: {
      income,
      fixed,
      toWorkWith: v1.month.toWorkWith,
      sentence,
      bar: { fixed, cushion: v1.month.bar.cushion, goals: v1.month.bar.goals, guiltFree: v1.month.bar.guiltFree },
    },
    cushion: v1.cushion,
    goals: v1.goals,
    steps: [...guide, ...rest].map((s, i) => ({ ...s, n: i + 1 })),
  };
}
