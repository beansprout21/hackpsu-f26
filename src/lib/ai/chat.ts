// "Why?" / "What if?" answers grounded in the user's plan (issue #6; v2.3 explain mode and memory, #76).
// Numbers come from engine math (what-if), deterministic explain facts (chips, docs/ASK_SPROUT.md), or the
// plan itself; the AI only phrases them. Rate and advice-boundary questions are answered deterministically
// so Sprout never invents a rate or gives investing advice. Question and history text are never logged.
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { Allocation, ChatIntent, ChatTurn, FinancialSnapshot, GoalId, GoalProfile, IncomeKind, Match, Plan, Product, SpendingBucketId, ValueTag } from "@/types";
import { fnbFitMatch, fundName, p1GoalId, productShortName } from "@/lib/client/chatCopy";
import { aboutTime, timeSpan } from "@/lib/client/time";
import { getProduct, isCatalogId } from "@/lib/server/catalog";
import { GOAL_LABELS } from "@/lib/server/engine/defaults";
import { monthsToTarget } from "@/lib/server/engine/math";
import { describeAiError, getClient, getModel } from "./client";
import { VOICE_RULES } from "./plan";
import { gapClaimsConsistent, goalWord, voiceNormalize, voiceSafe } from "./voice";

const CHAT_TIMEOUT_MS = 15_000;
const ADVISOR_LINE = "When you're ready for that, an FNB advisor can help.";
const MAX_SENTENCES = 4;
const MAX_WORDS = 70;

export interface ChatAnswer {
  answer: string;
  citedProductIds: string[];
}
export interface ChatResult extends ChatAnswer {
  aiUsed: boolean;
  route: "boundary" | "rate" | "what_if" | "explain" | "general";
  intent: ChatIntent["kind"];
  fallbackReason?: string;
}
export interface ChatContext {
  snapshot?: FinancialSnapshot;
  history?: ChatTurn[];
  intent?: ChatIntent;
  // Audit hook (scripts/ai-audit.ts): the AI's raw answer and the facts it saw, before any guard runs.
  onRaw?: (rawAnswer: string, facts: unknown) => void;
}

const CHAT_SYSTEM = [
  "You are Sprout, a warm, optimistic money coach for college students and young families, built as a prototype for FNB. Follow the voice rules.",
  `Answer the user's question about THEIR plan in 1 to ${MAX_SENTENCES} short sentences, at most ${MAX_WORDS} words in total.`,
  "Use only the facts and numbers in the JSON. If `explain` is given, the user tapped a question about that part of their plan: explain it from those facts. If `whatIf` is given, use exactly those numbers and never do your own arithmetic.",
  "`history` is the conversation so far (oldest first). Refer back to it naturally when it helps, for example \"Like we said about Japan...\".",
  "Do not ask the user a question; suggested next questions are shown separately.",
  "Never invent rates, fees, or products. If a rate isn't published, say to check the current rate with FNB.",
  'Call the emergency savings the "safety cushion", never "emergency fund".',
  'You are a prototype built for FNB, not FNB itself: say "FNB\'s" or the product name, never "our" products.',
  'Say "a month away" ONLY for a goal whose onTrack is false, with its gapMonthly or its turn_up_dial amount; an on-track goal is "on track", never "away".',
  "Durations: under 24 months say months; from 24 months say whole years, written the way the JSON's *Time fields are (\"about 4 years\"). Never write 24 or more months.",
  `Stay within budgeting, saving, credit building, and FNB products; for investing or taxes say "${ADVISOR_LINE}" and stop.`,
  "List every productId you mention in citedProductIds. Output JSON only.",
  "",
  VOICE_RULES,
].join("\n");

const AiChatSchema = z.object({ answer: z.string(), citedProductIds: z.array(z.string()) });

const BOUNDARY = /\b(invest(ing|ment|ments)?|stocks?|etfs?|index funds?|mutual funds?|crypto|bitcoin|401\(?k\)?|roth|brokerage|taxe?s?)\b/i;
const RATE = /\b(rate|rates|apy|apr|interest)\b/i;
const GOAL_WORDS: [GoalId, RegExp][] = [
  ["travel", /\b(japan|travel|trip|abroad|vacation)\b/i],
  ["first_home", /\b(home|house|place|apartment|mortgage|down payment)\b/i],
  ["credit_building", /\bcredit\b/i],
  ["emergency_fund", /\b(cushion|emergency|safety net)\b/i],
  ["education", /\b(school|education|tuition)\b/i],
  ["small_business", /\bbusiness\b/i],
  ["family", /\b(family|kids?)\b/i],
];

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const clean = (s: string, max: number) => s.replace(/\s+/g, " ").trim().slice(0, max);
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const firstSentence = (s: string) => s.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? s;
const bucket = (plan: Plan, id: SpendingBucketId) => plan.spendingPlan.find((b) => b.bucket === id)?.monthlyAmount ?? 0;

function planProducts(plan: Plan): Product[] {
  const ids = new Set([...plan.matches.map((m) => m.productId), ...(plan.stepOne.productId ? [plan.stepOne.productId] : [])]);
  return [...ids].map((id) => getProduct(id)).filter((p): p is Product => !!p);
}

// Products the question names, e.g. "SmartSecured", "Savers Goal CD", "student-checking".
function mentionedProducts(question: string, plan: Plan): Product[] {
  const q = question.toLowerCase();
  return planProducts(plan).filter((p) => {
    const name = p.name.toLowerCase().replace(/^fnb\s+/, "").replace(/\s*\(.*\)$/, "");
    const firstWord = name.split(" ")[0];
    return q.includes(name) || q.includes(p.id.replace(/-/g, " ")) || q.includes(p.id) || (firstWord.length >= 6 && q.includes(firstWord));
  });
}

// ---------- what if ----------
export interface WhatIf {
  goalId: GoalId;
  goalLabel: string;
  deltaMonthly: number;
  currentMonthly: number;
  newMonthly: number;
  targetAmount: number;
  requiredMonthly: number;
  currentMonthsToTarget: number;
  newMonthsToTarget: number;
  onTrackAfter: boolean;
  guiltFreeAfter: number;
  guiltFreeStaysAbove10Percent: boolean;
  cushion?: boolean; // the safety cushion bucket rather than a goal allocation
}

const AMOUNT = /\$\s?(\d[\d,]*(?:\.\d+)?)|(\d[\d,]*(?:\.\d+)?)\s*(?:dollars|bucks)?\s*(?:more|less|extra|fewer)?\s*(?:a|per|each|every|\/)\s*(?:month|mo)\b/i;
const LESS = /\b(less|fewer|cut|reduce|lower)\b/i;

function parseAmount(question: string): number | null {
  const amount = question.match(AMOUNT);
  if (!amount) return null;
  const value = Number((amount[1] ?? amount[2]).replace(/,/g, ""));
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function parseWhatIf(question: string, profile: GoalProfile, plan: Plan, snapshot?: FinancialSnapshot): WhatIf | null {
  const value = parseAmount(question);
  if (value === null) return null;
  if (!/\b(what if|if i|save|put|add|extra|more|less|move|cut)\b/i.test(question)) return null;
  const sign = LESS.test(question) ? -1 : 1;
  const planned = new Set(plan.allocation.map((a) => a.goalId));
  const named = GOAL_WORDS.find(([id, re]) => planned.has(id) && re.test(question))?.[0];
  return whatIfFor(named, sign * Math.round(value), profile, plan, snapshot);
}

// Exact engine math for "put $delta more (or less) a month toward goalId" (default: the P1 goal in the plan).
export function whatIfFor(goalIdIn: GoalId | undefined, deltaMonthly: number, profile: GoalProfile, plan: Plan, snapshot?: FinancialSnapshot): WhatIf | null {
  const planned = new Set(plan.allocation.map((a) => a.goalId));
  const p1 = [...profile.goals].sort((a, b) => a.priority - b.priority).find((g) => planned.has(g.id))?.id;
  const goalId = goalIdIn ?? p1;
  if (!goalId) return null;

  const guiltFree = bucket(plan, "guilt_free");
  const guiltFreeAfter = Math.max(0, guiltFree - Math.max(0, deltaMonthly));
  const guiltFreeStaysAbove10Percent = guiltFreeAfter >= 0.1 * plan.effectiveMonthlyIncome;
  const alloc = plan.allocation.find((a) => a.goalId === goalId);

  // The safety cushion is its own bucket, not a goal allocation (unless emergency_fund is also a goal).
  if (!alloc && goalId === "emergency_fund") {
    const saved = snapshot?.savingsBalance ?? 0;
    const current = bucket(plan, "emergency_fund");
    const newMonthly = Math.max(0, current + deltaMonthly);
    return {
      goalId,
      goalLabel: "safety cushion",
      deltaMonthly,
      currentMonthly: current,
      newMonthly,
      targetAmount: plan.cushionTarget,
      requiredMonthly: 0,
      currentMonthsToTarget: monthsToTarget(plan.cushionTarget, saved, current),
      newMonthsToTarget: monthsToTarget(plan.cushionTarget, saved, newMonthly),
      onTrackAfter: true,
      guiltFreeAfter,
      guiltFreeStaysAbove10Percent,
      cushion: true,
    };
  }

  const goal = profile.goals.find((g) => g.id === goalId);
  if (!alloc || !goal) return null;
  // Same target the engine used: the cushion target for the emergency fund, else the goal target.
  const targetAmount = goalId === "emergency_fund" ? plan.cushionTarget : goal.targetAmount;
  const newMonthly = Math.max(0, alloc.monthlyAmount + deltaMonthly);
  return {
    goalId,
    goalLabel: goalWord(goalId),
    deltaMonthly,
    currentMonthly: alloc.monthlyAmount,
    newMonthly,
    targetAmount,
    requiredMonthly: alloc.requiredMonthly,
    currentMonthsToTarget: alloc.monthsToTarget,
    newMonthsToTarget: monthsToTarget(targetAmount, 0, newMonthly),
    onTrackAfter: newMonthly >= alloc.requiredMonthly,
    guiltFreeAfter,
    guiltFreeStaysAbove10Percent,
  };
}

// Memory: "What about $70 instead?" reuses the goal and direction of the last what-if in the conversation.
function whatIfFromHistory(question: string, history: ChatTurn[], profile: GoalProfile, plan: Plan, snapshot?: FinancialSnapshot): WhatIf | null {
  const value = parseAmount(question);
  if (value === null) return null;
  for (const turn of [...history].reverse()) {
    if (turn.role !== "user") continue;
    const previous = parseWhatIf(turn.text, profile, plan, snapshot);
    if (!previous) continue;
    const sign = LESS.test(question) ? -1 : Math.sign(previous.deltaMonthly) || 1;
    return whatIfFor(previous.goalId, sign * Math.round(value), profile, plan, snapshot);
  }
  return null;
}

// "travel fund", "safety cushion"; credit and everyday banking have no fund, so they stay "<label> goal".
const goalName = (goalId: GoalId) =>
  goalId === "credit_building" || goalId === "everyday_banking" ? `${GOAL_LABELS[goalId]} goal` : fundName(goalId);

function whatIfTemplate(w: WhatIf): string {
  const name = w.cushion ? "safety cushion" : goalName(w.goalId);
  if (w.newMonthly <= 0) return `With ${usd(w.newMonthly)} a month, your ${name} pauses. Even a small automatic amount keeps it moving.`;
  const more = w.deltaMonthly > 0;
  const lead = more
    ? `Saving ${usd(w.deltaMonthly)} more a month gives your ${name} ${usd(w.newMonthly)} a month.`
    : `Saving ${usd(-w.deltaMonthly)} less a month leaves your ${name} ${usd(w.newMonthly)} a month.`;
  // DASHBOARD.md v2: specific times ("from about 16 years to about 12 years"), one shared formatter.
  const timing =
    w.currentMonthsToTarget > 0
      ? `That takes your ${usd(w.targetAmount)} goal from ${aboutTime(w.currentMonthsToTarget)} to ${aboutTime(w.newMonthsToTarget)}.`
      : `That reaches ${usd(w.targetAmount)} in ${aboutTime(w.newMonthsToTarget)}.`;
  const status = w.cushion ? "" : w.onTrackAfter ? "That puts it on track." : `It needs ${usd(w.requiredMonthly)} a month to stay on schedule.`;
  const source = more
    ? w.guiltFreeStaysAbove10Percent
      ? `Taking it from guilt-free money still leaves ${usd(w.guiltFreeAfter)} for fun.`
      : `Taking all of it from guilt-free money would leave ${usd(w.guiltFreeAfter)}, so consider part of it.`
    : "";
  return [lead, timing, status, source].filter(Boolean).join(" ");
}

// ---------- rate ----------
function rateAnswer(products: Product[]): ChatAnswer {
  const lines = products.map((p) =>
    /^check current rate/i.test(p.rateNote)
      ? `FNB doesn't publish the ${p.name} rate online, so check the current rate with FNB.`
      : `${p.name}: ${p.rateNote}.`,
  );
  return { answer: `${lines.join(" ")} Rates change, so confirm the current rate with FNB before you open anything.`, citedProductIds: products.map((p) => p.id) };
}

// ---------- explain facts (docs/ASK_SPROUT.md): deterministic, with a template answer ----------
interface Explained {
  facts: Record<string, unknown>;
  template: string;
  cited: string[];
}

const INCOME_WORDS: Record<IncomeKind, string> = {
  job: "your job",
  work_study: "work-study",
  family: "family",
  aid_refund: "aid refunds",
  scholarship: "scholarships",
  summer_savings: "summer savings",
  gig: "gig work",
  other: "other money",
};
const VALUE_LOVES: Record<ValueTag, string> = {
  freedom: "the freedom you love",
  security: "what makes you feel safe",
  experiences: "the experiences you love",
  family: "the people you love",
  growth: "what helps you grow",
  simplicity: "what keeps life easy",
};
const STAGE_WORDS = { now: "start-here steps", next: "next steps", later: "later steps" } as const;
const EVENT_WORDS = {
  first_paycheck: "your first paycheck",
  internship: "your internship",
  graduation: "graduation",
  full_time_job: "your first full-time job",
  turn_21: "your 21st birthday",
} as const;

const fixedPlusDebt = (plan: Plan, snapshot?: FinancialSnapshot) =>
  snapshot ? snapshot.monthlyFixedCosts + snapshot.monthlyDebtPayments : bucket(plan, "fixed_costs");

function explainStepOne(plan: Plan, profile: GoalProfile): Explained {
  const p1 = p1GoalId(profile);
  const p1Monthly = p1 ? (plan.allocation.find((a) => a.goalId === p1)?.monthlyAmount ?? 0) : 0;
  const amount = plan.monthlySurplus < 100 ? 10 : 20;
  // SPROUT.md v3 rule D, first match wins. If the plan's Step one is a different kind (older engine), no row is claimed.
  const rows: { row: string; when: boolean; kind: string; reason: string }[] = [
    { row: "D1", when: plan.monthlySurplus <= 0, kind: "budget", reason: "Right now your costs use everything coming in, so the first win is finding breathing room." },
    { row: "D2", when: p1 === "credit_building", kind: "learn", reason: "Building credit is your top goal, and your free report shows exactly where you're starting." },
    { row: "D3", when: p1 === "everyday_banking", kind: "habit", reason: "Getting your everyday banking right is your top goal, and alerts stop surprise fees before they start." },
    { row: "D4", when: !p1 || p1 === "emergency_fund", kind: "save", reason: "Your safety cushion comes first, and the first dollars in make it real." },
    { row: "D5", when: true, kind: "save", reason: `Your ${p1 ? fundName(p1) : "top goal"} is your top goal, and money moved today turns the plan into progress.` },
  ];
  const matched = rows.find((r) => r.when)!;
  const row = matched.kind === plan.stepOne.kind ? matched : null;
  const reason = row?.reason ?? "It's one thing you can do this week that moves the rest of your plan forward.";
  return {
    facts: {
      stepOne: { title: plan.stepOne.title, detail: plan.stepOne.detail, kind: plan.stepOne.kind },
      rule: row?.row ?? null,
      reason,
      p1Goal: p1 ?? null,
      p1Fund: p1 ? fundName(p1) : null,
      p1MonthlyAmount: p1Monthly,
      stepAmount: row?.kind === "save" ? amount : null,
    },
    template: `${reason} ${plan.stepOne.detail}`.trim(),
    cited: plan.stepOne.productId ? [plan.stepOne.productId] : [],
  };
}

function explainSplit(plan: Plan, profile: GoalProfile, snapshot?: FinancialSnapshot): Explained {
  const sum = (f: string) => (snapshot?.incomeSources ?? []).filter((s) => s.frequency === f).reduce((t, s) => t + s.amount, 0);
  const monthly = sum("monthly");
  const semester = sum("per_semester");
  const oneTime = sum("one_time");
  const kinds = (f: string) => [...new Set((snapshot?.incomeSources ?? []).filter((s) => s.frequency === f).map((s) => INCOME_WORDS[s.kind]))].join(" and ");
  const parts = [
    monthly > 0 && `${usd(monthly)} monthly from ${kinds("monthly")}`,
    semester > 0 && `${usd(semester / 4)} from ${kinds("per_semester")} (${usd(semester)} a semester ÷ 4)`,
    oneTime > 0 && `${usd(oneTime / 9)} from ${kinds("one_time")} (${usd(oneTime)} ÷ 9 school months)`,
  ].filter(Boolean);
  const fpd = fixedPlusDebt(plan, snapshot);
  const cushion = bucket(plan, "emergency_fund");
  const goals = bucket(plan, "goal_savings");
  const savings = cushion + goals;
  const guiltFree = bucket(plan, "guilt_free");
  const pct = (n: number) => (plan.effectiveMonthlyIncome > 0 ? Math.round((n / plan.effectiveMonthlyIncome) * 100) : 0);
  const loves = VALUE_LOVES[profile.topValues[0] ?? "simplicity"];
  const income = parts.length ? `Your ${usd(plan.effectiveMonthlyIncome)} a month is ${parts.join(" + ")}.` : `You have ${usd(plan.effectiveMonthlyIncome)} a month coming in.`;
  return {
    facts: {
      effectiveMonthlyIncome: plan.effectiveMonthlyIncome,
      incomeMath: { monthly, perSemesterTotal: semester, perSemesterDivisor: 4, perSemesterMonthly: semester / 4, oneTimeTotal: oneTime, oneTimeDivisor: 9, oneTimeMonthly: oneTime / 9 },
      fixedPlusDebt: fpd,
      savings: { monthly: savings, percent: pct(savings), cushion, goals },
      guiltFree: { monthly: guiltFree, percent: pct(guiltFree), protectedFor: loves },
      monthlySurplus: plan.monthlySurplus,
    },
    template: [
      income,
      `After ${usd(fpd)} for fixed costs, ${usd(savings)} (${pct(savings)}%) goes to savings: ${usd(cushion)} to your safety cushion and ${usd(goals)} to goals.`,
      `The other ${usd(guiltFree)} is guilt-free, protected on purpose for ${loves}.`,
    ].join(" "),
    cited: [],
  };
}

function explainCushion(plan: Plan, snapshot?: FinancialSnapshot): Explained {
  const fpd = fixedPlusDebt(plan, snapshot);
  const target = plan.cushionTarget;
  const months = fpd > 0 ? Math.round(target / fpd) : 0;
  const floorApplied = fpd * 3 < target && target === 1000;
  const saved = snapshot?.savingsBalance ?? null;
  const monthly = bucket(plan, "emergency_fund");
  const met = saved !== null ? saved >= target : plan.cushionFillsInMonths === null && monthly === 0;
  const milestoneInMonths = saved !== null && saved < fpd && monthly > 0 ? Math.ceil((fpd - saved) / monthly) : null;
  // The milestone line drops once passed, or when it lands the same month the cushion is full.
  const showMilestone = milestoneInMonths !== null && milestoneInMonths !== plan.cushionFillsInMonths;
  const lead = floorApplied
    ? `Your safety cushion is ${usd(target)}, the starting floor, since 3 months of your bills comes in under that.`
    : `Your safety cushion is ${usd(target)}: ${months} ${months === 1 ? "month" : "months"} of your ${usd(fpd)} in monthly bills.`;
  const timing = met
    ? "It's already full, so every savings dollar goes to your goals."
    : monthly > 0 && plan.cushionFillsInMonths
      ? `At ${usd(monthly)} a month, ${showMilestone ? `you're 1 month covered in ${timeSpan(milestoneInMonths)} and ` : ""}it's full in ${timeSpan(plan.cushionFillsInMonths)}.`
      : "";
  return {
    facts: {
      cushionTarget: target,
      monthsCovered: months,
      fixedPlusDebt: fpd,
      rule: "3 x (fixed costs + debt payments), at least $1,000",
      floorApplied,
      savedSoFar: saved,
      savedCounts: true,
      monthlyToCushion: monthly,
      milestone: { label: "1 month covered", amount: fpd, inTime: milestoneInMonths ? aboutTime(milestoneInMonths) : null },
      fullInTime: plan.cushionFillsInMonths ? aboutTime(plan.cushionFillsInMonths) : null,
      met,
      // Only irregular income gets the irregular-income reason (cycle 3: steady earners were told their income is irregular).
      steadyIncome: snapshot?.hasSteadyIncome ?? null,
      why: snapshot?.hasSteadyIncome
        ? "If income stops for a while (a job change or a surprise), 3 months keeps rent and bills covered."
        : "Irregular money: if it stops for a month or two, rent and bills are still covered.",
    },
    template: [
      lead,
      "If money stops coming in for a while, your rent and bills are still covered.",
      saved !== null && saved > 0 && !met ? `The ${usd(saved)} you already have counts toward it.` : "",
      timing,
    ]
      .filter(Boolean)
      .join(" "),
    cited: [],
  };
}

function feeLine(product?: Product) {
  return product?.keyTerms.find((t) => /fee/i.test(t)) ?? null;
}

function fitReasons(m: Match): string[] {
  const goal = goalWord(m.goalId);
  return [
    m.breakdown.goalFit >= 28 && `it fits your ${goal} goal`,
    m.breakdown.eligibility >= 18 && "you qualify for it today",
    m.breakdown.affordability >= 14 && "it fits your budget",
    m.breakdown.priority >= 10 && "it serves one of your top goals",
  ].filter((r): r is string => !!r);
}

function explainProduct(kind: "why_product" | "product_fees", plan: Plan, profile: GoalProfile, snapshot?: FinancialSnapshot, productId?: string): Explained | null {
  const match = plan.matches.find((m) => m.productId === productId) ?? (productId ? undefined : fnbFitMatch(plan, profile, snapshot));
  if (!match) return null;
  const product = getProduct(match.productId);
  const name = product?.name ?? productShortName(match.productId);
  const fee = feeLine(product);
  const rate = product && !/^check current rate/i.test(product.rateNote) ? `Rate: ${product.rateNote}.` : "Check the current rate with FNB.";
  const facts = {
    productId: match.productId,
    product: name,
    stage: match.stage,
    goal: goalWord(match.goalId),
    feeLine: fee,
    rateNote: product?.rateNote ?? null,
    keyTerms: product?.keyTerms ?? [],
    whyItFits: fitReasons(match),
    explanation: match.explanation,
    unlockCondition: match.unlockCondition ?? null,
  };
  const template =
    kind === "product_fees"
      ? `${fee ? `${name}: ${fee.replace(/\.$/, "")}.` : `FNB doesn't list a fee for ${name} online, so confirm it with a banker.`} ${rate}`
      : [
          match.explanation.trim()
            ? firstSentence(match.explanation.trim())
            : `${name} is in your ${STAGE_WORDS[match.stage]} for your ${goalWord(match.goalId)} goal.`,
          fee ? `${fee.replace(/\.$/, "")}.` : "",
        ]
          .filter(Boolean)
          .join(" ");
  return { facts, template, cited: [match.productId] };
}

function explainUnlock(plan: Plan, profile: GoalProfile, snapshot: FinancialSnapshot | undefined, intent: ChatIntent): Explained | null {
  const match =
    plan.matches.find((m) => m.stage === "later" && intent.productId && m.productId === intent.productId) ??
    plan.matches.find((m) => m.stage === "later" && intent.goalId && m.goalId === intent.goalId && m.unlockCondition);
  if (!match?.unlockCondition) return null;
  const trigger = match.unlockTrigger ?? null;
  const saved = snapshot?.savingsBalance ?? null;
  const monthly = bucket(plan, "emergency_fund") || bucket(plan, "goal_savings");
  const gap = trigger?.kind === "savings_threshold" && saved !== null ? Math.max(0, trigger.amount - saved) : null;
  const monthsAway = gap && monthly > 0 ? Math.ceil(gap / monthly) : null;
  const meanwhile = plan.matches.find((m) => m.stage === "now" && m.goalId === match.goalId);
  const meanwhileName = meanwhile ? productShortName(meanwhile.productId) : null;
  const short = productShortName(match.productId);
  const distance =
    gap !== null && gap > 0
      ? `You have ${usd(saved ?? 0)} saved, so you're ${usd(gap)} away${monthsAway ? `: ${aboutTime(monthsAway)} at ${usd(monthly)} a month` : ""}.`
      : trigger?.kind === "life_event"
        ? `That starts with ${EVENT_WORDS[trigger.event]}.`
        : "";
  return {
    facts: {
      productId: match.productId,
      product: short,
      goal: goalWord(match.goalId),
      unlockCondition: match.unlockCondition,
      unlockTrigger: trigger,
      savedSoFar: saved,
      dollarsAway: gap,
      timeAway: monthsAway ? aboutTime(monthsAway) : null,
      monthlySaving: monthly,
      meanwhile: meanwhile ? { productId: meanwhile.productId, product: meanwhileName } : { stepOne: plan.stepOne.title },
      p1Goal: p1GoalId(profile) ?? null,
    },
    template: [
      `The ${short} unlocks ${lowerFirst(match.unlockCondition).replace(/\.$/, "")}.`,
      distance,
      meanwhileName ? `Meanwhile, ${meanwhileName} can get you ready.` : `Meanwhile, start with: ${plan.stepOne.title}`,
    ]
      .filter(Boolean)
      .join(" "),
    cited: [match.productId, ...(meanwhile ? [meanwhile.productId] : [])],
  };
}

function explainGap(plan: Plan, profile: GoalProfile, question: string, goalIdIn?: GoalId): Explained | null {
  const goalId = goalIdIn ?? p1GoalId(profile);
  const alloc = plan.allocation.find((a) => a.goalId === goalId);
  if (!goalId || !alloc) return null;
  const fund = fundName(goalId);
  const guiltFree = bucket(plan, "guilt_free");
  const gap = Math.max(0, alloc.requiredMonthly - alloc.monthlyAmount);
  const laterMatch = plan.matches.find((m) => m.stage === "later" && m.goalId === goalId && m.unlockCondition);
  // "What if I give it more time?" leads with the more-time lever; otherwise the engine's order (dial first).
  const askedTime = /\b(time|longer|months?|years?)\b/i.test(question);
  const levers = askedTime
    ? [...alloc.levers].sort((a, b) => Number(b.kind === "more_time") - Number(a.kind === "more_time"))
    : alloc.levers;
  const leverLines = levers.map((l, i) => {
    const or = i === 0 ? "" : "Or ";
    if (l.kind === "turn_up_dial") return `${or}${i === 0 ? "Move" : "move"} ${usd(l.moveFromGuiltFree)} from guilt-free and you'd still have ${usd(guiltFree - l.moveFromGuiltFree)} for fun.`;
    if (l.kind === "more_time") return `${or}${i === 0 ? "Give" : "give"} it ${timeSpan(l.newHorizonMonths)} at your current pace.`;
    return `${or}${i === 0 ? "Aim" : "aim"} for ${usd(l.reachableAmount)} on your current timeline.`;
  });
  const lead = alloc.onTrack
    ? `Your ${fund} is on track: ${usd(alloc.monthlyAmount)} a month gets you there in ${aboutTime(alloc.monthsToTarget)}.`
    : alloc.monthlyAmount === 0 && laterMatch?.unlockCondition
      ? `Your ${fund} starts growing ${lowerFirst(laterMatch.unlockCondition).replace(/\.$/, "")}.`
      : `Your ${fund} needs ${usd(alloc.requiredMonthly)} a month and gets ${usd(alloc.monthlyAmount)}, so it's ${usd(gap)} a month away.`;
  // #114: "What if I give it more time?" answers the what-if itself (the new time at the current pace), not the gap again.
  const moreTime = alloc.levers.find((l) => l.kind === "more_time");
  const dial = alloc.levers.find((l) => l.kind === "turn_up_dial");
  const horizon = profile.goals.find((g) => g.id === goalId)?.horizonMonths;
  const moreTimeAnswer =
    askedTime && moreTime && !alloc.onTrack && alloc.monthlyAmount > 0
      ? [
          `At ${usd(alloc.monthlyAmount)} a month, your ${fund} gets there in ${aboutTime(moreTime.newHorizonMonths)}${horizon ? ` instead of ${timeSpan(horizon)}` : ""}.`,
          dial ? `To keep your timeline, move ${usd(dial.moveFromGuiltFree)} from guilt-free instead.` : "",
        ]
          .filter(Boolean)
          .join(" ")
      : null;
  return {
    facts: {
      goalId,
      fund,
      requiredMonthly: alloc.requiredMonthly,
      allocatedMonthly: alloc.monthlyAmount,
      gapMonthly: gap,
      timeAtPace: alloc.monthsToTarget > 0 ? aboutTime(alloc.monthsToTarget) : null,
      onTrack: alloc.onTrack,
      levers: levers.map((l) =>
        l.kind === "turn_up_dial"
          ? { ...l, guiltFreeAfter: guiltFree - l.moveFromGuiltFree }
          : l.kind === "more_time"
            ? leverFacts(l)
            : l,
      ),
      guiltFreeMonthly: guiltFree,
      unlockCondition: laterMatch?.unlockCondition ?? null,
    },
    template: moreTimeAnswer ?? [lead, ...(alloc.onTrack ? [] : leverLines)].slice(0, MAX_SENTENCES).join(" "),
    cited: [],
  };
}

// Exported for scripts/check-chat.ts (deterministic facts; no AI).
export function explain(intent: ChatIntent, question: string, profile: GoalProfile, plan: Plan, snapshot?: FinancialSnapshot): Explained | null {
  switch (intent.kind) {
    case "why_step_one":
      return explainStepOne(plan, profile);
    case "how_split":
      return explainSplit(plan, profile, snapshot);
    case "why_cushion":
      return explainCushion(plan, snapshot);
    case "why_product":
    case "product_fees":
      return explainProduct(intent.kind, plan, profile, snapshot, intent.productId);
    case "when_unlock":
      return explainUnlock(plan, profile, snapshot, intent) ?? explainGap(plan, profile, question, intent.goalId);
    case "goal_gap":
      return explainGap(plan, profile, question, intent.goalId);
    default:
      return null;
  }
}

// ---------- AI ----------
// AI-facing durations are the formatted *Time strings only: raw month counts invite "about 3 years instead
// of 38" and 24+ month phrasing (#121), and leaving them out lets the number guard block them.
type Lever = Allocation["levers"][number];
const leverFacts = (l: Lever) => (l.kind === "more_time" ? { kind: l.kind, newHorizonTime: aboutTime(l.newHorizonMonths) } : l);
function allocationFacts(a: Allocation) {
  return {
    goalId: a.goalId,
    monthlyAmount: a.monthlyAmount,
    requiredMonthly: a.requiredMonthly,
    onTrack: a.onTrack,
    timeAtPace: a.monthsToTarget > 0 ? aboutTime(a.monthsToTarget) : null,
    levers: a.levers.map(leverFacts),
  };
}
function whatIfFacts(w: WhatIf) {
  const { currentMonthsToTarget, newMonthsToTarget, ...rest } = w;
  return {
    ...rest,
    currentTime: currentMonthsToTarget > 0 ? aboutTime(currentMonthsToTarget) : null,
    newTime: newMonthsToTarget > 0 ? aboutTime(newMonthsToTarget) : null,
    gapAfter: !w.cushion && !w.onTrackAfter ? Math.round(w.requiredMonthly - w.newMonthly) : null,
  };
}

function chatFacts(question: string, profile: GoalProfile, plan: Plan, extra: { whatIf: WhatIf | null; explain: Record<string, unknown> | null; intent: ChatIntent["kind"] }) {
  return {
    question,
    intent: extra.intent,
    explain: extra.explain,
    whatIf: extra.whatIf && whatIfFacts(extra.whatIf),
    persona: profile.persona.label,
    topValues: profile.topValues,
    richLife: profile.richLifeStatement,
    goals: profile.goals.map((g) => {
      const a = plan.allocation.find((x) => x.goalId === g.id);
      return { id: g.id, label: goalWord(g.id), fund: fundName(g.id), why: g.why, motivation: g.motivation, targetAmount: g.targetAmount, horizonMonths: g.horizonMonths, horizonTime: aboutTime(g.horizonMonths), allocation: a ? allocationFacts(a) : null, gapMonthly: a && !a.onTrack ? Math.round(a.requiredMonthly - a.monthlyAmount) : null };
    }),
    money: {
      effectiveMonthlyIncome: plan.effectiveMonthlyIncome,
      monthlySurplus: plan.monthlySurplus,
      spendingPlan: plan.spendingPlan.map((b) => ({ bucket: b.bucket, monthlyAmount: b.monthlyAmount })),
      cushionTarget: plan.cushionTarget,
      cushionFillsInMonths: plan.cushionFillsInMonths,
      futureYou: plan.futureYou,
    },
    stepOne: { title: plan.stepOne.title, detail: plan.stepOne.detail },
    matches: plan.matches.map((m) => {
      const p = getProduct(m.productId);
      return {
        productId: m.productId,
        product: p?.name,
        goal: goalWord(m.goalId),
        stage: m.stage,
        unlockCondition: m.unlockCondition ?? null,
        explanation: m.explanation,
        termsToKnow: m.termsToKnow,
        rateNote: p?.rateNote ?? null,
      };
    }),
    notYet: plan.notYet.map((n) => ({ reason: n.reason, revisitWhen: n.revisitWhen })),
  };
}

// Every number in the answer must appear in the facts or in something the user typed.
function numbersAllowed(text: string, ...sources: unknown[]): boolean {
  const allowed = new Set<string>(["0", "1", "2", "3"]);
  for (const raw of JSON.stringify(sources).match(/\d[\d,]*(?:\.\d+)?/g) ?? []) {
    const n = Number(raw.replace(/,/g, ""));
    if (!Number.isFinite(n)) continue;
    allowed.add(String(n));
    allowed.add(String(Math.round(n)));
    allowed.add(String(Math.floor(n)));
  }
  return (text.match(/\d[\d,]*(?:\.\d+)?/g) ?? []).every((t) => allowed.has(String(Number(t.replace(/,/g, "")))));
}

// At most 4 sentences and 70 words (ASK_SPROUT.md answer rules); longer answers use the template.
function withinLength(text: string): string | null {
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean).slice(0, MAX_SENTENCES).join(" ");
  return sentences.split(/\s+/).length <= MAX_WORDS ? sentences : null;
}

async function aiAnswer(facts: ReturnType<typeof chatFacts>, history: ChatTurn[]): Promise<ChatAnswer> {
  const client = getClient();
  if (!client) throw new Error("ANTHROPIC_API_KEY not set");
  const model = getModel();
  const response = await client.messages.parse(
    {
      model,
      max_tokens: 2000,
      // Grounded short answer over given facts: thinking off on Sonnet 5.5 keeps chat snappy.
      ...(model === "claude-sonnet-5-5" ? { thinking: { type: "between_tools" as const } } : {}),
      output_config: { effort: "low", format: zodOutputFormat(AiChatSchema) },
      system: CHAT_SYSTEM,
      messages: [{ role: "user", content: JSON.stringify({ ...facts, history }, null, 2) }],
    },
    { timeout: CHAT_TIMEOUT_MS, maxRetries: 0, signal: AbortSignal.timeout(CHAT_TIMEOUT_MS) },
  );
  if (response.stop_reason !== "end_turn") throw new Error(`stop_reason=${response.stop_reason}`);
  if (!response.parsed_output) throw new Error("no parsed output");
  return response.parsed_output;
}

function generalFallback(question: string, plan: Plan): ChatAnswer {
  const named = mentionedProducts(question, plan);
  const match = named.length ? plan.matches.find((m) => m.productId === named[0].id) : undefined;
  if (match) return { answer: match.explanation, citedProductIds: [match.productId] };
  return {
    answer: `Your plan starts with one step: ${plan.stepOne.title.replace(/[.!]?$/, ".")} ${plan.sproutSays}`,
    citedProductIds: plan.stepOne.productId ? [plan.stepOne.productId] : [],
  };
}

// citedProductIds: only real catalog products that are in this plan.
function keepCited(ids: string[], plan: Plan): string[] {
  const inPlan = new Set(planProducts(plan).map((p) => p.id));
  return [...new Set(ids)].filter((id) => isCatalogId(id) && inPlan.has(id));
}

export async function answerQuestion(question: string, profile: GoalProfile, plan: Plan, context: ChatContext = {}): Promise<ChatResult> {
  const q = clean(question, 500);
  const { snapshot } = context;
  const history = (context.history ?? []).slice(-6).map((t) => ({ role: t.role, text: clean(t.text, 600) }));
  const intent = context.intent ?? { kind: "free" as const };

  if (BOUNDARY.test(q)) {
    return { answer: ADVISOR_LINE, citedProductIds: [], aiUsed: false, route: "boundary", intent: intent.kind };
  }
  const named = mentionedProducts(q, plan);
  if (intent.kind === "free" && RATE.test(q) && named.length) {
    return { ...rateAnswer(named), aiUsed: false, route: "rate", intent: intent.kind };
  }

  let whatIf: WhatIf | null = null;
  let explained: Explained | null = null;
  if (intent.kind === "what_if") {
    // A goal that isn't in this plan (e.g. memory from an older plan) falls back to the P1 goal.
    whatIf =
      whatIfFor(intent.goalId, Math.round(intent.amount ?? 0), profile, plan, snapshot) ??
      whatIfFor(undefined, Math.round(intent.amount ?? 0), profile, plan, snapshot);
  } else if (intent.kind === "free") {
    whatIf = parseWhatIf(q, profile, plan, snapshot) ?? whatIfFromHistory(q, history, profile, plan, snapshot);
  } else {
    explained = explain(intent, q, profile, plan, snapshot);
  }
  const route = whatIf ? "what_if" : explained ? "explain" : "general";
  const fallback: ChatAnswer = whatIf
    ? { answer: whatIfTemplate(whatIf), citedProductIds: [] }
    : explained
      ? { answer: explained.template, citedProductIds: explained.cited }
      : generalFallback(q, plan);

  try {
    const facts = chatFacts(q, profile, plan, { whatIf, explain: explained?.facts ?? null, intent: intent.kind });
    const ai = await aiAnswer(facts, history);
    context.onRaw?.(ai.answer, facts);
    const raw = clean(ai.answer, 700);
    if (!raw) throw new Error("empty answer");
    const userTyped = [q, ...history.filter((t) => t.role === "user").map((t) => t.text)];
    if (!numbersAllowed(raw, facts, userTyped)) throw new Error("number guard");
    const short = withinLength(raw);
    if (!short) throw new Error("length guard");
    const voiced = voiceSafe(short);
    if (!voiced) throw new Error("voice guard");
    const answer = voiceNormalize(voiced);
    // A what-if may name the gap left after the change.
    const afterGap = whatIf && !whatIf.cushion && !whatIf.onTrackAfter ? [whatIf.requiredMonthly - whatIf.newMonthly] : [];
    if (!gapClaimsConsistent(answer, plan, afterGap)) throw new Error("consistency guard");
    return { answer, citedProductIds: keepCited([...ai.citedProductIds, ...(explained?.cited.slice(0, 1) ?? [])], plan), aiUsed: true, route, intent: intent.kind };
  } catch (error) {
    return {
      ...fallback,
      answer: capitalize(voiceNormalize(fallback.answer)),
      citedProductIds: keepCited(fallback.citedProductIds, plan),
      aiUsed: false,
      route,
      intent: intent.kind,
      fallbackReason: describeAiError(error),
    };
  }
}
