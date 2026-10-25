// Stress test (#97): 300 seeded generated users + edge cases through the engine and buildOverview(),
// every Ask Sprout intent for 20 users (templates; --live adds 10 users with the real AI when a key is set),
// and the API route handlers with malformed bodies. Prints a Markdown report; --out <file> also writes it.
// Run: AI_DISABLED=1 DEMO_AUTH_BYPASS=1 npx --yes tsx scripts/stress.ts [--live] [--out file]
import { writeFileSync } from "node:fs";
import { SWIPE_CARDS } from "../src/data/swipeCards";
import { fallbackProfile } from "../src/lib/ai/profile";
import { answerQuestion } from "../src/lib/ai/chat";
import { buildOverview } from "../src/lib/client/overview";
import { blockChips, starterChips } from "../src/lib/client/chatCopy";
import { getProduct, isCatalogId } from "../src/lib/server/catalog";
import { buildPlanSkeleton } from "../src/lib/server/engine/plan";
import { jordan, maya } from "../src/data/personas";
import {
  CreditBandSchema,
  GoalIdSchema,
  IncomeFrequencySchema,
  IncomeKindSchema,
  IntakeAnswersSchema,
  LifeStageSchema,
  PlanSchema,
  ValueTagSchema,
} from "../src/types/schemas";
import type { ChatIntent, FinancialSnapshot, GoalAnswer, GoalId, GoalProfile, IntakeAnswers, IncomeSource, Plan, ValueTag } from "../src/types";

const args = process.argv.slice(2);
const LIVE = args.includes("--live");
const OUT = args.includes("--out") ? args[args.indexOf("--out") + 1] : undefined;
const SEED = 9707;
const GENERATED = 300;
const CHAT_USERS = 20;
const LIVE_USERS = 10;

// ---------- seeded random ----------
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(SEED);
const int = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));
const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)];
const shuffle = <T,>(xs: readonly T[]): T[] => [...xs].sort(() => rand() - 0.5);
const chance = (p: number) => rand() < p;

// ---------- users ----------
const HABITS: GoalId[] = ["everyday_banking", "credit_building"];
const MONEY_GOALS = GoalIdSchema.options.filter((g) => !HABITS.includes(g));
const isHabit = (id: GoalId) => HABITS.includes(id);
const PER_MONTH = { monthly: 1, per_semester: 4, one_time: 9 } as const;

interface User {
  id: string;
  intake: IntakeAnswers;
  snapshot: FinancialSnapshot;
}

function swipes(n = int(6, Math.min(10, SWIPE_CARDS.length))) {
  return SWIPE_CARDS.slice(0, n).map((c) => ({ cardId: c.id, choice: chance(0.5) ? ("left" as const) : ("right" as const) }));
}

function generatedUser(i: number): User {
  const moneyCount = int(0, 3);
  const habitCount = moneyCount === 0 ? int(1, 2) : int(0, 2);
  const money = shuffle(MONEY_GOALS).slice(0, moneyCount);
  const habits = shuffle(HABITS).slice(0, habitCount);
  const goals: GoalAnswer[] = [
    ...money.map((id, k) => ({
      id,
      priority: (k + 1) as 1 | 2 | 3,
      horizonMonths: int(1, 120),
      ...(chance(0.7) ? { targetAmount: chance(0.05) ? 0 : int(1, 400) * 50 } : {}),
      why: chance(0.5) ? "" : "because it matters to me",
    })),
    // Two thirds are shaped like the intake sends them (habits ranked after money goals, capped at 3);
    // the rest give habits any priority (1..3), as an API caller could, so "habits are never P1" is exercised.
    ...habits.map((id, k) => ({
      id,
      priority: (i % 3 === 2 ? int(1, 3) : Math.min(moneyCount + k + 1, 3)) as 1 | 2 | 3,
      horizonMonths: int(1, 120),
      why: "",
    })),
  ];
  const values = shuffle(ValueTagSchema.options).slice(0, int(1, 3)) as ValueTag[];
  const targetIncome = chance(0.08) ? 0 : int(0, 8000);
  const sources: IncomeSource[] = [];
  let left = targetIncome;
  const n = targetIncome === 0 ? 0 : int(1, 4);
  for (let k = 0; k < n && left > 0; k++) {
    const frequency = pick(IncomeFrequencySchema.options);
    const share = k === n - 1 ? left : int(1, left);
    left -= share;
    sources.push({ kind: pick(IncomeKindSchema.options), amount: share * PER_MONTH[frequency], frequency });
  }
  const costCeiling = Math.max(200, Math.round(targetIncome * 1.4));
  const debt = chance(0.4) ? int(0, Math.round(costCeiling * 0.3)) : 0;
  return {
    id: `gen-${String(i).padStart(3, "0")}`,
    intake: { lifeStage: pick(LifeStageSchema.options), swipes: swipes(), values, goals },
    snapshot: {
      hasSteadyIncome: chance(0.5),
      incomeSources: sources,
      monthlyFixedCosts: int(0, costCeiling),
      monthlyDebtPayments: debt,
      savingsBalance: chance(0.15) ? 0 : int(0, 50000),
      creditBand: pick(CreditBandSchema.options),
      isFnbCustomer: chance(0.3),
    },
  };
}

const base = (over: Partial<FinancialSnapshot> = {}): FinancialSnapshot => ({ ...maya.snapshot, ...over });
const goal = (id: GoalId, priority: 1 | 2 | 3, horizonMonths: number, targetAmount?: number): GoalAnswer => ({
  id,
  priority,
  horizonMonths,
  ...(targetAmount !== undefined ? { targetAmount } : {}),
  why: "",
});
const edge = (id: string, goals: GoalAnswer[], snapshot: FinancialSnapshot, values: ValueTag[] = ["experiences"]): User => ({
  id,
  intake: { lifeStage: "student", swipes: swipes(8), values, goals },
  snapshot,
});

const EDGE_CASES: User[] = [
  { id: "edge-maya", intake: maya.intake, snapshot: maya.snapshot },
  { id: "edge-jordan", intake: jordan.intake, snapshot: jordan.snapshot },
  edge("edge-no-income", [goal("travel", 1, 12, 2000)], base({ incomeSources: [] })),
  edge("edge-income-equals-costs", [goal("travel", 1, 12, 2000)], base({ incomeSources: [{ kind: "job", amount: 650, frequency: "monthly" }] })),
  edge(
    "edge-huge-numbers",
    [goal("first_home", 1, 120, 1e9), goal("travel", 2, 1, 1e8)],
    base({ incomeSources: [{ kind: "job", amount: 1e8, frequency: "one_time" }], monthlyFixedCosts: 1e6, savingsBalance: 1e9 }),
  ),
  edge("edge-habits-only", [goal("credit_building", 1, 12), goal("everyday_banking", 2, 12)], base()),
  edge("edge-habit-p1-with-money-goal", [goal("credit_building", 1, 12), goal("travel", 2, 12, 2500)], base()),
  edge("edge-1-month-horizon", [goal("travel", 1, 1, 2500)], base()),
  edge("edge-120-month-horizon", [goal("first_home", 1, 120, 30000)], base()),
  edge("edge-target-0", [goal("travel", 1, 12, 0)], base()),
  edge("edge-cushion-met", [goal("travel", 1, 12, 2500)], base({ savingsBalance: 20000 })),
  edge(
    "edge-all-far-off-track",
    [goal("first_home", 1, 6, 40000), goal("travel", 2, 3, 9000), goal("small_business", 3, 2, 15000)],
    base(),
  ),
  edge("edge-duplicate-goal-ids", [goal("travel", 1, 12, 2500), goal("travel", 2, 24, 4000)], base()),
  edge("edge-security-top-value", [goal("travel", 1, 12, 2500)], base(), ["security"]),
];

// ---------- checks ----------
type Failure = { invariant: string; user: User; detail: string; size: number };
const results = new Map<string, { pass: number; fail: Failure[] }>();
const sizeOf = (u: User) =>
  u.intake.goals.length * 10 +
  u.snapshot.incomeSources.length * 10 +
  Math.log10(
    1 +
      u.snapshot.incomeSources.reduce((s, x) => s + x.amount, 0) +
      u.snapshot.monthlyFixedCosts +
      u.snapshot.savingsBalance +
      u.intake.goals.reduce((s, g) => s + (g.targetAmount ?? 0), 0),
  );
function record(invariant: string, user: User, ok: boolean, detail = "") {
  const r = results.get(invariant) ?? { pass: 0, fail: [] };
  if (ok) r.pass++;
  else r.fail.push({ invariant, user, detail, size: sizeOf(user) });
  results.set(invariant, r);
}

const BANNED = /\b(only|just|behind|should have|can't afford|waste)\b/i;
const ACCOUNT_CATEGORIES = ["checking", "savings", "cd", "credit_card", "small_business"];
// Observation, not an invariant: loan products that reach the first 4 guide steps (the Overview), per product.
const guideLoans = new Map<string, number>();
const FUND: Partial<Record<GoalId, string>> = {
  travel: "travel fund",
  first_home: "home fund",
  education: "education fund",
  small_business: "business fund",
  family: "family fund",
  emergency_fund: "safety cushion",
};
const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const words = (s: string) => s.split(/\s+/).filter(Boolean).length;

// DASHBOARD.md v2: under 24 months -> "about N months"; 24+ -> "about N years"; over 50 years -> "more than 50 years".
function duration(months: number): string {
  if (months > 600) return "more than 50 years";
  if (months >= 24) return `about ${Math.round(months / 12)} years`;
  return `about ${months} ${months === 1 ? "month" : "months"}`;
}

// Rule D (SPROUT.md v3.2), re-derived from the spec, not from the engine.
function expectedStepOne(u: User, profile: GoalProfile, plan: Plan): { title: string; detail: string } {
  const A = usd(plan.monthlySurplus < 100 ? 10 : 20);
  const money = [...profile.goals].filter((g) => !isHabit(g.id)).sort((a, b) => a.priority - b.priority);
  const habits = profile.goals.filter((g) => isHabit(g.id)).map((g) => g.id);
  const p1 = money[0];
  const cushionMet = u.snapshot.savingsBalance >= plan.cushionTarget;
  const cushionFirst = ["security", "family"].includes(profile.topValues[0] ?? "");
  if (plan.monthlySurplus <= 0)
    return { title: "Open your bank app and find last week's 3 biggest buys.", detail: "That's where we'll find your breathing room." };
  if (!p1 && habits.includes("credit_building"))
    return { title: "Check your free credit report now.", detail: "5 minutes at annualcreditreport.com. Free, and it doesn't hurt your score." };
  if (!p1 && habits.includes("everyday_banking"))
    return { title: "Turn on low-balance alerts in your bank app.", detail: "No surprise fees, ever." };
  if (!p1 || p1.id === "emergency_fund" || (cushionFirst && !cushionMet))
    return { title: `Move ${A} into savings right now.`, detail: `That starts your ${usd(plan.cushionTarget)} safety cushion.` };
  const monthly = plan.allocation.find((a) => a.goalId === p1.id)?.monthlyAmount ?? 0;
  return { title: `Move ${A} into your ${FUND[p1.id]} right now.`, detail: `You'll put ${usd(monthly)} a month toward it. This starts it.` };
}

// Every string in a value, with its path (for the non-empty and wording checks).
function strings(value: unknown, path: string, out: [string, string][] = []): [string, string][] {
  if (typeof value === "string") out.push([path, value]);
  else if (Array.isArray(value)) value.forEach((v, i) => strings(v, `${path}[${i}]`, out));
  else if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) strings(v, `${path}.${k}`, out);
  return out;
}
function badNumbers(value: unknown, path: string, out: string[] = []): string[] {
  if (typeof value === "number") {
    if (!Number.isFinite(value) || (value < 0 && !/(monthlySurplus|toWorkWith)$/.test(path))) out.push(`${path}=${value}`);
  } else if (Array.isArray(value)) value.forEach((v, i) => badNumbers(v, `${path}[${i}]`, out));
  else if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) badNumbers(v, `${path}.${k}`, out);
  return out;
}

// The Overview model changes shape in #94 (v2: `steps` replaces `fnbFit` + `path`, 4-part month bar);
// read it structurally so the harness checks whichever shape is on main.
interface OverviewItem { n?: number; stage?: string; productId?: string; unlock?: string; kind?: string; title?: string; feeLine?: string; url?: string }
interface LooseOverview {
  goals: { goalId: GoalId; line: string; tone: string; lever?: { label: string; askSprout: string } }[];
  month: { sentence: string; toWorkWith: number; bar: Record<string, number>; income?: number; fixed?: number };
  cushion: { progressLine: string; fullInMonths: number | null; milestoneInMonths: number | null };
  steps?: OverviewItem[];
  path?: OverviewItem[];
  fnbFit?: { productId: string } | null;
}

function checkUser(u: User): { plan: Plan; profile: GoalProfile } | null {
  const valid = IntakeAnswersSchema.safeParse(u.intake);
  record("intake is contract-valid (fixture sanity)", u, valid.success, valid.success ? "" : valid.error.issues[0]?.message ?? "");
  let profile: GoalProfile, plan: Plan, o: LooseOverview;
  try {
    profile = fallbackProfile(u.intake);
    plan = buildPlanSkeleton(profile, u.snapshot, u.intake);
    o = buildOverview(plan, profile, u.snapshot) as unknown as LooseOverview;
    record("no crash (profile, engine, Overview)", u, true);
  } catch (error) {
    record("no crash (profile, engine, Overview)", u, false, error instanceof Error ? `${error.message} @ ${error.stack?.split("\n")[1]?.trim()}` : String(error));
    return null;
  }

  const parsed = PlanSchema.safeParse(plan);
  record("plan is schema-valid", u, parsed.success, parsed.success ? "" : JSON.stringify(parsed.error.issues.slice(0, 2)));
  const bad = [...badNumbers(plan, "plan"), ...badNumbers(o, "overview")];
  record("no NaN / Infinity / negative money", u, bad.length === 0, bad.slice(0, 4).join(", "));

  const bucket = (id: string) => plan.spendingPlan.find((b) => b.bucket === id)?.monthlyAmount ?? 0;
  const earmark = plan.futureYou.earmarkMonthly ?? 0;
  const saved = bucket("emergency_fund") + bucket("goal_savings") + bucket("guilt_free") + earmark;
  const allocated = plan.allocation.reduce((s, a) => s + a.monthlyAmount, 0);
  const room = Math.max(0, Math.floor(plan.monthlySurplus));
  record("allocation <= surplus", u, allocated <= room && saved <= room, `allocated ${allocated}, buckets ${saved}, surplus ${plan.monthlySurplus}`);
  if (plan.monthlySurplus > 0) {
    const total = bucket("fixed_costs") + saved;
    record("buckets sum to income", u, Math.abs(total - plan.effectiveMonthlyIncome) < 1, `buckets ${total} vs income ${plan.effectiveMonthlyIncome}`);
  }
  // Every goal-savings dollar lands on a money goal (no orphan goal money when only habits or a cushion goal remain).
  const goalAlloc = plan.allocation.filter((a) => a.goalId !== "emergency_fund").reduce((s, a) => s + a.monthlyAmount, 0);
  const efAlloc = plan.allocation.find((a) => a.goalId === "emergency_fund")?.monthlyAmount ?? 0;
  const goalBucket = bucket("goal_savings");
  const homed = goalAlloc === goalBucket || (efAlloc > 0 && goalAlloc === 0 && efAlloc === bucket("emergency_fund") + goalBucket);
  record("goal bucket lands on money goals", u, homed, `goal bucket $${goalBucket}, money-goal allocations $${goalAlloc}, goals: ${profile.goals.map((g) => g.id).join(", ")}`);

  const costs = u.snapshot.monthlyFixedCosts + u.snapshot.monthlyDebtPayments;
  const cushion = Math.max(1000, Math.round(3 * costs * 100) / 100);
  record("cushion = max($1,000, 3 x costs)", u, plan.cushionTarget === cushion && plan.emergencyFundTarget === cushion, `got ${plan.cushionTarget}, expected ${cushion}`);
  const habitRows = plan.allocation.filter((a) => isHabit(a.goalId));
  record("no habit allocation", u, habitRows.length === 0, habitRows.map((a) => `${a.goalId} $${a.monthlyAmount}`).join(", "));

  const items: OverviewItem[] = o.steps ?? o.path ?? [];
  const productIds = [
    ...plan.matches.map((m) => m.productId),
    ...plan.steps.flatMap((s) => (s.productId ? [s.productId] : [])),
    ...plan.notYet.flatMap((n) => (n.productId ? [n.productId] : [])),
    ...items.flatMap((s) => (s.productId ? [s.productId] : [])),
  ];
  const loans = productIds.filter((id) => getProduct(id)?.category === "student_loan");
  record("no student loans", u, loans.length === 0, loans.join(", "));
  const unknown = productIds.filter((id) => !isCatalogId(id));
  record("every product id is in the catalog", u, unknown.length === 0, unknown.join(", "));

  // Rule set B: with no surplus the plan is budget/habit steps plus $0 products (null = deposit not published).
  if (plan.monthlySurplus <= 0) {
    const costly = plan.matches.filter((m) => m.stage !== "later" && (getProduct(m.productId)?.minOpeningDeposit ?? 0) > 0);
    record(
      "no surplus: only $0 products now/next",
      u,
      costly.length === 0,
      costly.map((m) => `${m.stage} ${m.productId} ($${getProduct(m.productId)?.minOpeningDeposit} to open)`).join(", "),
    );
  }

  const want = expectedStepOne(u, profile, plan);
  record(
    "Step one matches rule D",
    u,
    plan.stepOne.title === want.title && plan.stepOne.detail === want.detail,
    `got "${plan.stepOne.title} / ${plan.stepOne.detail}", rule D says "${want.title} / ${want.detail}"`,
  );

  const all = [...strings(plan, "plan"), ...strings(o, "overview")];
  const tenPlus = all.filter(([, s]) => /10\+\s*years/i.test(s));
  record('no "10+ years"', u, tenPlus.length === 0, tenPlus.map(([p, s]) => `${p}: "${s}"`).slice(0, 2).join("; "));

  const ids = o.goals.map((g) => g.goalId);
  const dupes = ids.filter((id, k) => ids.indexOf(id) !== k);
  record("no duplicate or emergency-fund goal lines", u, dupes.length === 0 && !ids.includes("emergency_fund"), `goal lines: ${ids.join(", ")}`);

  const empty = strings(o, "overview").filter(([, s]) => s.trim() === "");
  record("every Overview string non-empty", u, empty.length === 0, empty.map(([p]) => p).slice(0, 4).join(", "));

  // Voice: Sprout's own text (engine templates + Overview copy), not catalog facts (termsToKnow, product names).
  const voice = [
    plan.headline,
    plan.sproutSays,
    plan.stepOne.title,
    plan.stepOne.detail,
    ...plan.spendingPlan.map((b) => b.note),
    ...plan.matches.map((m) => m.explanation),
    ...plan.steps.flatMap((s) => [s.title, s.detail]),
    ...plan.notYet.flatMap((n) => [n.reason, n.revisitWhen]),
    ...strings(o, "overview").map(([, s]) => s),
  ];
  const banned = voice.filter((s) => BANNED.test(s));
  record("no banned voice words", u, banned.length === 0, banned.slice(0, 2).map((s) => `"${s}"`).join("; "));

  const laterMissing = plan.matches.filter((m) => m.stage === "later" && (!m.unlockCondition || !m.unlockTrigger));
  const laterItems = items.filter((s) => s.stage === "later" && !s.unlock);
  record("unlock condition on every later item", u, laterMissing.length === 0 && laterItems.length === 0, [...laterMissing.map((m) => m.productId), ...laterItems.map((s) => `overview:${s.productId}`)].join(", "));

  // v2 guide: numbered 1..n, step 1 is Step one, product steps carry a catalog product, fee line and its FNB URL.
  if (o.steps) {
    const guide: string[] = [];
    o.steps.forEach((st, k) => {
      if (st.n !== k + 1) guide.push(`step ${k + 1} numbered ${st.n}`);
      if (st.kind === "product") {
        const product = st.productId ? getProduct(st.productId) : undefined;
        if (!product) guide.push(`step ${st.n} product ${st.productId ?? "missing"}`);
        // Rule set E: every *account* states its fee; tools, programs and loans carry no fee line by design.
        if (product && ACCOUNT_CATEGORIES.includes(product.category) && !st.feeLine?.trim()) guide.push(`step ${st.n} (${st.productId}) has no fee line`);
        if (product && /loan/.test(product.category) && (st.n ?? 99) <= 4) {
          guideLoans.set(product.id, (guideLoans.get(product.id) ?? 0) + 1);
        }
        if (!st.url || (product && !product.sourceUrls.includes(st.url))) guide.push(`step ${st.n} (${st.productId}) url ${st.url ?? "missing"} not in catalog`);
      } else if (st.productId) guide.push(`step ${st.n} (${st.kind}) has product ${st.productId}`);
    });
    if (o.steps[0]?.kind !== "move" || o.steps[0]?.title !== plan.stepOne.title) guide.push(`step 1 is "${o.steps[0]?.title}", not Step one`);
    const ids = o.steps.flatMap((st) => (st.productId ? [st.productId] : []));
    if (new Set(ids).size !== ids.length) guide.push(`duplicate products: ${ids.join(", ")}`);
    record("step-by-step guide well-formed", u, guide.length === 0, guide.slice(0, 3).join("; "));
  }
  const habitLines = o.goals.filter((g) => isHabit(g.goalId) && /\$\d/.test(g.line));
  record("habit goal lines have no dollar amounts", u, habitLines.length === 0, habitLines.map((g) => `"${g.line}"`).join("; "));

  // Months/years: every duration in a goal line matches the engine number, in the v2 format.
  const timeProblems: string[] = [];
  for (const g of o.goals) {
    const a = plan.allocation.find((x) => x.goalId === g.goalId);
    const said = g.line.match(/(about \d+ (?:months?|years)|more than 50 years)(?= at your pace)/)?.[1];
    if (said && a && said !== duration(a.monthsToTarget)) timeProblems.push(`${g.goalId}: "${said}" but ${a.monthsToTarget} months -> "${duration(a.monthsToTarget)}"`);
    const rawMonths = g.line.match(/\b(\d+) months\b/)?.[1];
    if (rawMonths && Number(rawMonths) >= 24) timeProblems.push(`${g.goalId}: "${rawMonths} months" should be years`);
  }
  const full = o.cushion.progressLine.match(/full in (\d+) months?/)?.[1];
  if (full && Number(full) !== o.cushion.fullInMonths) timeProblems.push(`cushion "full in ${full}" vs ${o.cushion.fullInMonths}`);
  const mile = o.cushion.progressLine.match(/1 month covered in (\d+) months?/)?.[1];
  if (mile && Number(mile) !== o.cushion.milestoneInMonths) timeProblems.push(`milestone "${mile}" vs ${o.cushion.milestoneInMonths}`);
  record("months/years strings match the numbers", u, timeProblems.length === 0, timeProblems.slice(0, 2).join("; "));

  // Month block numbers match the plan.
  const monthProblems: string[] = [];
  const amounts = (o.month.sentence.match(/\$[\d,]+/g) ?? []).map((s) => Number(s.replace(/[$,]/g, "")));
  if (plan.monthlySurplus > 0 && !amounts.includes(Math.round(plan.monthlySurplus))) monthProblems.push(`sentence lacks surplus ${usd(plan.monthlySurplus)}: "${o.month.sentence}"`);
  const barTotal = Object.values(o.month.bar).reduce((s, n) => s + n, 0);
  const barTarget = "fixed" in o.month.bar ? bucket("fixed_costs") + saved - earmark : saved - earmark;
  if (plan.monthlySurplus > 0 && Math.abs(barTotal - barTarget) > 1) monthProblems.push(`bar ${barTotal} vs buckets ${barTarget}`);
  record("month block matches the plan", u, monthProblems.length === 0, monthProblems.join("; "));

  return { plan, profile };
}

// ---------- chat ----------
const chatRows: { user: string; intent: string; problem: string }[] = [];
let chatCalls = 0;
async function checkChat(u: User, plan: Plan, profile: GoalProfile, live: boolean) {
  const intents: { intent: ChatIntent; question: string }[] = [];
  try {
    for (const c of starterChips(plan, profile, u.snapshot)) intents.push({ intent: c.intent, question: c.question });
    const blocks = blockChips(plan, profile, u.snapshot);
    for (const c of [...blocks.nextMove, ...blocks.fnbFit, ...blocks.month, ...blocks.cushion]) intents.push({ intent: c.intent, question: c.question });
    for (const cs of Object.values(blocks.goals)) for (const c of cs ?? []) intents.push({ intent: c.intent, question: c.question });
    for (const cs of Object.values(blocks.path)) for (const c of cs ?? []) intents.push({ intent: c.intent, question: c.question });
  } catch (error) {
    chatRows.push({ user: u.id, intent: "chips", problem: `chip builder threw: ${error instanceof Error ? error.message : String(error)}` });
  }
  const p1 = [...profile.goals].filter((g) => !isHabit(g.id)).sort((a, b) => a.priority - b.priority)[0]?.id;
  const direct: ChatIntent[] = [
    { kind: "why_step_one" },
    { kind: "how_split" },
    { kind: "why_cushion" },
    ...plan.matches.map((m) => ({ kind: "why_product" as const, productId: m.productId })),
    ...plan.matches.map((m) => ({ kind: "product_fees" as const, productId: m.productId })),
    ...plan.matches.filter((m) => m.stage === "later").map((m) => ({ kind: "when_unlock" as const, productId: m.productId })),
    ...profile.goals.map((g) => ({ kind: "goal_gap" as const, goalId: g.id })),
    ...(p1 ? [{ kind: "what_if" as const, goalId: p1, amount: 50 }, { kind: "what_if" as const, goalId: p1, amount: -50 }] : []),
  ];
  for (const intent of direct) intents.push({ intent, question: intent.kind.replace(/_/g, " ") });
  for (const q of ["Why this first?", "What if I save $50 more a month?", "When can I get a credit card?", "Should I invest in index funds?", "What's the rate on my savings?"]) {
    intents.push({ intent: { kind: "free" }, question: q });
  }
  for (const { intent, question } of live ? intents.slice(0, 8) : intents) {
    chatCalls++;
    const label = `${intent.kind}${"productId" in intent && intent.productId ? `:${intent.productId}` : ""}${"goalId" in intent && intent.goalId ? `:${intent.goalId}` : ""}`;
    try {
      const r = await answerQuestion(question, profile, plan, { snapshot: u.snapshot, intent });
      const problems: string[] = [];
      if (!r.answer.trim()) problems.push("empty answer");
      if (words(r.answer) > 70) problems.push(`${words(r.answer)} words`);
      if (BANNED.test(r.answer)) problems.push(`banned word: "${r.answer.match(BANNED)?.[0]}"`);
      if (/10\+\s*years/i.test(r.answer)) problems.push('"10+ years"');
      // DASHBOARD.md v2: time is always specific, Ask Sprout answers included: 24+ months reads as years.
      // product_fees answers quote catalog terms ("1.00% APY for 3 to 48 months"), which are product facts.
      const longMonths =
        intent.kind === "product_fees" ? [] : [...r.answer.matchAll(/\b(\d+) months\b/g)].map((x) => Number(x[1])).filter((n) => n >= 24);
      if (longMonths.length) problems.push(`"${longMonths[0]} months" should be years`);
      if (/NaN|Infinity|undefined|\$-/.test(r.answer)) problems.push(`bad value in "${r.answer}"`);
      const uncited = r.citedProductIds.filter((id) => !isCatalogId(id));
      if (uncited.length) problems.push(`unknown cited ids ${uncited.join(", ")}`);
      if (live && !r.aiUsed && r.route !== "boundary" && r.route !== "rate") problems.push(`live AI fell back (${r.fallbackReason ?? "?"})`);
      if (problems.length) chatRows.push({ user: u.id, intent: label, problem: `${problems.join("; ")} | answer: "${r.answer.slice(0, 160)}"` });
    } catch (error) {
      chatRows.push({ user: u.id, intent: label, problem: `threw: ${error instanceof Error ? error.message : String(error)}` });
    }
  }
}

// ---------- APIs ----------
const apiRows: { route: string; case: string; status: number | string; ok: boolean; note: string }[] = [];
async function call(route: string, label: string, handler: () => Promise<Response>, expect: number[]) {
  try {
    const res = await handler();
    const text = await res.text();
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      body = undefined;
    }
    const envelope =
      !!body && typeof body === "object" && "ok" in body && ((body as { ok: boolean }).ok ? "data" in body : typeof (body as { error?: unknown }).error === "string");
    const ok = expect.includes(res.status) && envelope;
    apiRows.push({ route, case: label, status: res.status, ok, note: envelope ? "" : `not an envelope: ${text.slice(0, 80)}` });
  } catch (error) {
    apiRows.push({ route, case: label, status: "threw", ok: false, note: error instanceof Error ? error.message : String(error) });
  }
}
const post = (url: string, body: string, type = "application/json") =>
  new Request(`http://localhost${url}`, { method: "POST", body, headers: { "content-type": type } });

async function checkApis(sample: { user: User; plan: Plan; profile: GoalProfile }) {
  const { POST: profilePOST } = await import("../src/app/api/profile/route");
  const { POST: planPOST } = await import("../src/app/api/plan/route");
  const { POST: chatPOST } = await import("../src/app/api/chat/route");
  const share = await import("../src/app/api/share/route");
  const { POST: extractPOST } = await import("../src/app/api/extract/route");
  const bankerList = await import("../src/app/api/banker/plans/route");
  const bankerOne = await import("../src/app/api/banker/plans/[id]/route");

  const { user, plan, profile } = sample;
  const intake = user.intake;
  const six = MONEY_GOALS.map((id, k) => goal(id, ((k % 3) + 1) as 1 | 2 | 3, 12, 1000));
  const fourHabits = [goal("credit_building", 1, 12), goal("credit_building", 2, 12), goal("everyday_banking", 3, 12), goal("everyday_banking", 3, 12)];
  const malformed: [string, string][] = [
    ["not JSON", "{"],
    ["empty object", "{}"],
    ["wrong types", JSON.stringify({ intake: "x", profile: 3, snapshot: [], plan: null, question: 7 })],
    ["6 money goals", JSON.stringify({ intake: { ...intake, goals: six }, profile, snapshot: user.snapshot })],
    ["4 habits", JSON.stringify({ intake: { ...intake, goals: fourHabits }, profile, snapshot: user.snapshot })],
    ["negative money", JSON.stringify({ intake, profile, snapshot: { ...user.snapshot, monthlyFixedCosts: -5 } })],
    ["Infinity (1e400)", `{"intake":${JSON.stringify(intake)},"profile":${JSON.stringify(profile)},"snapshot":${JSON.stringify({ ...user.snapshot, savingsBalance: 1 }).replace('"savingsBalance":1', '"savingsBalance":1e400')}}`],
    ["horizon 0", JSON.stringify({ intake: { ...intake, goals: [goal("travel", 1, 0, 100)] }, profile, snapshot: user.snapshot })],
    ["huge strings", JSON.stringify({ intake: { ...intake, richLifeText: "x".repeat(100_000) }, profile, snapshot: user.snapshot, question: "y".repeat(100_000) })],
  ];
  // /api/profile reads only `intake`, so a bad snapshot alongside a valid intake is correctly ignored.
  const profileIgnores = new Set(["negative money", "Infinity (1e400)"]);
  for (const [label, body] of malformed) {
    await call("POST /api/profile", label, () => profilePOST(post("/api/profile", body)), profileIgnores.has(label) ? [200] : [400]);
    await call("POST /api/plan", label, () => planPOST(post("/api/plan", body)), [400]);
    await call("POST /api/chat", label, () => chatPOST(post("/api/chat", body)), [400]);
    await call("POST /api/share", label, () => share.POST(post("/api/share", body)), [400, 503]);
  }
  await call("POST /api/chat", "7 history turns", () => chatPOST(post("/api/chat", JSON.stringify({ question: "Why?", profile, plan, history: Array(7).fill({ role: "user", text: "hi" }) }))), [400]);
  await call("POST /api/chat", "question 501 chars", () => chatPOST(post("/api/chat", JSON.stringify({ question: "q".repeat(501), profile, plan }))), [400]);
  await call("POST /api/chat", "unknown intent", () => chatPOST(post("/api/chat", JSON.stringify({ question: "Why?", profile, plan, intent: { kind: "hack" } }))), [400]);
  // Valid bodies (sanity): AI is off, so these exercise the template paths end to end.
  await call("POST /api/profile", "valid", () => profilePOST(post("/api/profile", JSON.stringify({ intake }))), [200]);
  await call("POST /api/plan", "valid", () => planPOST(post("/api/plan", JSON.stringify({ intake, profile, snapshot: user.snapshot }))), [200]);
  await call("POST /api/chat", "valid", () => chatPOST(post("/api/chat", JSON.stringify({ question: "Why this first?", profile, plan, snapshot: user.snapshot }))), [200]);
  // Sharing without Upstash: the documented 503 envelope.
  await call("GET /api/share", "no storage configured", () => share.GET(new Request("http://localhost/api/share")), [200, 503]);
  await call("DELETE /api/share", "no storage configured", () => share.DELETE(new Request("http://localhost/api/share", { method: "DELETE" })), [200, 503]);
  await call("GET /api/banker/plans", "no storage configured", () => bankerList.GET(), [200, 503]);
  await call("GET /api/banker/plans/[id]", "unknown id", () => bankerOne.GET(new Request("http://localhost/api/banker/plans/x"), { params: Promise.resolve({ id: "nope" }) }), [404, 503]);
  // Upload: wrong shapes must be 4xx envelopes; a real image with AI off is the documented fallback.
  const form = (blob?: Blob, name = "file", filename = "a.png") => {
    const f = new FormData();
    if (blob) f.append(name, blob, filename);
    return new Request("http://localhost/api/extract", { method: "POST", body: f });
  };
  const png = new Blob([Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], { type: "image/png" });
  // With AI off the route answers 503 before reading the upload, so the validation cases run with AI "on"
  // and a dummy key: each one is rejected before any network call. The valid PNG then runs with AI off.
  const env = { disabled: process.env.AI_DISABLED, key: process.env.ANTHROPIC_API_KEY };
  process.env.AI_DISABLED = "";
  process.env.ANTHROPIC_API_KEY = env.key || "dummy-key-validation-only";
  await call("POST /api/extract", "JSON instead of multipart", () => extractPOST(post("/api/extract", "{}")), [400, 415]);
  await call("POST /api/extract", "no file field", () => extractPOST(form()), [400]);
  await call("POST /api/extract", "text/plain file", () => extractPOST(form(new Blob(["hi"], { type: "text/plain" }), "file", "a.txt")), [400, 415]);
  await call("POST /api/extract", "over 4 MB", () => extractPOST(form(new Blob([new Uint8Array(4 * 1024 * 1024 + 1)], { type: "image/png" }))), [400, 413]);
  process.env.AI_DISABLED = env.disabled ?? "";
  if (env.key === undefined) delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = env.key;
  if (process.env.AI_DISABLED === "1") await call("POST /api/extract", "PNG with AI off", () => extractPOST(form(png)), [503]);
}

// ---------- run ----------
async function main() {
  const t0 = Date.now();
  const users = [...EDGE_CASES, ...Array.from({ length: GENERATED }, (_, i) => generatedUser(i))];
  const built: { user: User; plan: Plan; profile: GoalProfile }[] = [];
  for (const u of users) {
    const r = checkUser(u);
    if (r) built.push({ user: u, ...r });
  }
  const tEngine = Date.now();
  const chatUsers = [...built.filter((b) => b.user.id.startsWith("edge-")).slice(0, 4), ...built.filter((b) => b.user.id.startsWith("gen-"))].slice(0, CHAT_USERS);
  for (const b of chatUsers) await checkChat(b.user, b.plan, b.profile, false);
  const tChat = Date.now();
  let liveNote = "not requested (run with --live)";
  if (LIVE) {
    if (!process.env.ANTHROPIC_API_KEY || process.env.AI_DISABLED === "1") liveNote = "skipped: no ANTHROPIC_API_KEY (or AI_DISABLED=1)";
    else {
      for (const b of built.filter((x) => x.user.id.startsWith("gen-")).slice(0, LIVE_USERS)) await checkChat(b.user, b.plan, b.profile, true);
      liveNote = `ran ${LIVE_USERS} users`;
    }
  }
  const sample = built.find((b) => b.user.id === "edge-maya") ?? built[0];
  if (sample) await checkApis(sample);
  const tApi = Date.now();

  const lines: string[] = [];
  lines.push(`## Harness results (seed ${SEED}, ${users.length} users: ${EDGE_CASES.length} edge cases + ${GENERATED} generated)`, "");
  lines.push(`Timing: engine + Overview ${tEngine - t0} ms, chat ${tChat - tEngine} ms (${chatCalls} answers), APIs ${tApi - tChat} ms, total ${tApi - t0} ms.`, "");
  lines.push("| Invariant | Pass | Fail |", "| --- | --- | --- |");
  for (const [name, r] of results) lines.push(`| ${name} | ${r.pass} | ${r.fail.length ? `**${r.fail.length}**` : 0} |`);
  lines.push("", "### Smallest failing case per invariant", "");
  const failing = [...results.entries()].filter(([, r]) => r.fail.length);
  if (!failing.length) lines.push("None.");
  for (const [name, r] of failing) {
    const smallest = [...r.fail].sort((a, b) => a.size - b.size)[0];
    const ids = r.fail.map((f) => f.user.id);
    lines.push(`**${name}** (${r.fail.length}; e.g. ${ids.slice(0, 6).join(", ")}${ids.length > 6 ? ", ..." : ""})`, "");
    lines.push(`- ${smallest.user.id}: ${smallest.detail.replace(/\|/g, "\\|")}`, "");
    // Distinct failure shapes (numbers normalized), so one invariant's separate bugs stay apart.
    const shapes = new Map<string, number>();
    for (const f of r.fail) {
      for (const part of f.detail.split("; ")) {
        const shape = part.replace(/\$[\d,.]+/g, "$N").replace(/\b\d+(\.\d+)?\b/g, "N");
        shapes.set(shape, (shapes.get(shape) ?? 0) + 1);
      }
    }
    if (shapes.size > 1) {
      lines.push("Distinct shapes:", "");
      for (const [shape, n] of [...shapes].sort((a, b) => b[1] - a[1]).slice(0, 10)) lines.push(`- ${n} x ${shape.replace(/\|/g, "\\|")}`);
      lines.push("");
    }
    lines.push("```json", JSON.stringify({ intake: { ...smallest.user.intake, swipes: `${smallest.user.intake.swipes.length} cards` }, snapshot: smallest.user.snapshot }), "```", "");
  }
  lines.push("### Observation: loan products in the first 4 guide steps", "");
  lines.push(
    guideLoans.size
      ? [...guideLoans].sort((a, b) => b[1] - a[1]).map(([id, n]) => `- ${id} (${getProduct(id)?.category}): ${n} users`).join("\n")
      : "None.",
    "",
  );
  lines.push(`### Ask Sprout (${chatUsers.length} users, templates; live AI: ${liveNote})`, "");
  lines.push(`${chatCalls} answers, ${chatRows.length} problems.`, "");
  if (chatRows.length) {
    const chatShapes = new Map<string, number>();
    for (const r of chatRows) {
      const shape = `${r.intent.split(":")[0]}: ${r.problem.split(" | answer:")[0].replace(/\$[\d,.]+/g, "$N").replace(/\b\d+\b/g, "N")}`;
      chatShapes.set(shape, (chatShapes.get(shape) ?? 0) + 1);
    }
    lines.push("Distinct shapes:", "", ...[...chatShapes].sort((a, b) => b[1] - a[1]).map(([s, n]) => `- ${n} x ${s.replace(/\|/g, "\\|")}`), "");
    lines.push("| User | Intent | Problem |", "| --- | --- | --- |");
    for (const r of chatRows.slice(0, 40)) lines.push(`| ${r.user} | ${r.intent} | ${r.problem.replace(/\|/g, "\\|")} |`);
    if (chatRows.length > 40) lines.push(`| ... | | ${chatRows.length - 40} more |`);
  }
  lines.push("", `### API route handlers (${apiRows.length} calls, ${apiRows.filter((r) => !r.ok).length} problems)`, "");
  lines.push("| Route | Case | Status | OK | Note |", "| --- | --- | --- | --- | --- |");
  for (const r of apiRows) lines.push(`| ${r.route} | ${r.case} | ${r.status} | ${r.ok ? "yes" : "**no**"} | ${r.note.replace(/\|/g, "\\|")} |`);
  const report = lines.join("\n");
  console.log(report);
  if (OUT) writeFileSync(OUT, `${report}\n`);
  const crashes = (results.get("no crash (profile, engine, Overview)")?.fail.length ?? 0) + apiRows.filter((r) => r.status === "threw").length + chatRows.filter((r) => r.problem.startsWith("threw")).length;
  console.error(`\nstress: ${failing.length} failing invariants, ${chatRows.length} chat problems, ${apiRows.filter((r) => !r.ok).length} API problems, ${crashes} crashes, ${tApi - t0} ms`);
  process.exit(crashes ? 1 : 0);
}

void main();
