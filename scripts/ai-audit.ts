// Overnight AI audit (#121): runs the real profile + plan pipeline with live AI for a stratified sample of
// users, then chip answers across every Ask Sprout intent, and writes docs/AI_AUDIT.md with per-item flags.
// The console prints counts only (never user text or numbers).
//   npx tsx --env-file=.env.local scripts/ai-audit.ts --cycle 1 [--plans 25] [--chats 50] [--out docs/AI_AUDIT.md]
import { writeFileSync } from "node:fs";
import rawCatalog from "../src/data/catalog.json";
import { PERSONA_BY_VALUE, personaFromValues } from "../src/data/personaTaxonomy";
import { scenarios } from "../src/data/scenarios";
import { SWIPE_CARDS } from "../src/data/swipeCards";
import { answerQuestion, whatIfFor } from "../src/lib/ai/chat";
import { getModel } from "../src/lib/ai/client";
import { generatePlan, type AiPlanText } from "../src/lib/ai/plan";
import { gapClaimsConsistent, voiceNormalize } from "../src/lib/ai/voice";
import { generateProfile } from "../src/lib/ai/profile";
import { blockChips, followUpChips, starterChips, type Chip } from "../src/lib/client/chatCopy";
import { buildPlanSkeleton } from "../src/lib/server/engine/plan";
import { GoalIdSchema, IncomeFrequencySchema, IncomeKindSchema, LifeStageSchema, ValueTagSchema, CreditBandSchema } from "../src/types/schemas";
import type { ChatIntent, ChatTurn, FinancialSnapshot, GoalAnswer, GoalId, GoalProfile, IntakeAnswers, IncomeSource, Plan, Product, ValueTag } from "../src/types";

// ---------- args ----------
const args = process.argv.slice(2);
const arg = (name: string, fallback: string) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback);
const CYCLE = Number(arg("--cycle", "1"));
const PLANS = Number(arg("--plans", "25"));
const CHATS = Number(arg("--chats", "50"));
const OUT = arg("--out", "docs/AI_AUDIT.md");
const SEED = 12100 + CYCLE;
const PLAN_CONCURRENCY = 3;
const CHAT_CONCURRENCY = 4;
const LATENCY_LIMIT_MS = 20_000;

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
const pickOne = <T,>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)];
const shuffle = <T,>(xs: readonly T[]): T[] => [...xs].sort(() => rand() - 0.5);
const chance = (p: number) => rand() < p;

// ---------- sample: rotating scenarios + a stratified grid of generated users ----------
interface User {
  id: string;
  intake: IntakeAnswers;
  snapshot: FinancialSnapshot;
  strata: { lifeStage: string; persona: string; surplus: boolean; customer: boolean };
}

const HABITS: GoalId[] = ["everyday_banking", "credit_building"];
const MONEY_GOALS = GoalIdSchema.options.filter((g) => !HABITS.includes(g));
const PER_MONTH = { monthly: 1, per_semester: 4, one_time: 9 } as const;
const VALUES = ValueTagSchema.options as readonly ValueTag[];
const STAGES = LifeStageSchema.options;
const WHYS = ["", "", "study abroad", "stop renting", "my kids", "a car for work", "feel less stressed", "start my own shop"];

function generatedUser(i: number): User {
  // Stratified: life stage, persona (top value), surplus yes/no and FNB customer yes/no all rotate.
  const lifeStage = STAGES[i % STAGES.length];
  const top = VALUES[i % VALUES.length];
  const surplus = i % 2 === 0;
  const customer = Math.floor(i / 2) % 2 === 1;
  const values = [top, ...shuffle(VALUES.filter((v) => v !== top)).slice(0, int(0, 2))];
  const moneyCount = int(1, 3);
  const habitCount = moneyCount === 3 ? 0 : int(0, 1);
  const goals: GoalAnswer[] = [
    ...shuffle(MONEY_GOALS).slice(0, moneyCount).map((id, k) => ({
      id,
      priority: (k + 1) as 1 | 2 | 3,
      horizonMonths: pickOne([6, 12, 18, 24, 36, 60, 84, 120]),
      ...(chance(0.6) ? { targetAmount: int(4, 300) * 50 } : {}),
      why: pickOne(WHYS),
    })),
    ...shuffle(HABITS).slice(0, habitCount).map((id, k) => ({ id, priority: Math.min(moneyCount + k + 1, 3) as 1 | 2 | 3, horizonMonths: 12, why: "" })),
  ];
  const income = lifeStage === "young_family" ? int(2000, 7000) : int(300, 2500);
  const sources: IncomeSource[] = [];
  let left = income;
  const n = int(1, 3);
  for (let k = 0; k < n && left > 0; k++) {
    const frequency = pickOne(IncomeFrequencySchema.options);
    const share = k === n - 1 ? left : int(1, left);
    left -= share;
    sources.push({ kind: pickOne(IncomeKindSchema.options), amount: share * PER_MONTH[frequency], frequency });
  }
  const fixed = surplus ? Math.round(income * (0.3 + rand() * 0.45)) : Math.round(income * (1 + rand() * 0.3));
  return {
    id: `c${CYCLE}-gen-${String(i).padStart(2, "0")}`,
    intake: {
      lifeStage,
      swipes: SWIPE_CARDS.map((c) => ({ cardId: c.id, choice: chance(0.5) ? ("left" as const) : ("right" as const) })),
      values,
      goals,
    },
    snapshot: {
      hasSteadyIncome: lifeStage !== "student" || chance(0.3),
      incomeSources: sources,
      monthlyFixedCosts: fixed,
      monthlyDebtPayments: chance(0.3) ? int(25, 300) : 0,
      savingsBalance: chance(0.2) ? 0 : int(0, 8000),
      creditBand: pickOne(CreditBandSchema.options),
      isFnbCustomer: customer,
    },
    strata: { lifeStage, persona: PERSONA_BY_VALUE[top].label, surplus, customer },
  };
}

function sample(): User[] {
  const scenarioCount = Math.min(3, PLANS);
  const start = ((CYCLE - 1) * scenarioCount) % scenarios.length;
  const picked = Array.from({ length: scenarioCount }, (_, k) => scenarios[(start + k) % scenarios.length]);
  const fromScenarios: User[] = picked.map((s) => ({
    id: `c${CYCLE}-${s.id}`,
    intake: s.intake,
    snapshot: s.snapshot,
    strata: {
      lifeStage: s.intake.lifeStage,
      persona: personaFromValues(s.intake.values).label,
      surplus: true,
      customer: s.snapshot.isFnbCustomer,
    },
  }));
  return [...fromScenarios, ...Array.from({ length: PLANS - scenarioCount }, (_, i) => generatedUser(i))];
}

// ---------- text checks ----------
const catalog = rawCatalog as unknown as Product[];
const productNames = catalog.flatMap((p) => {
  const short = p.name.replace(/^FNB\s+/, "").replace(/\s*\(.*\)\s*$/, "");
  return [{ id: p.id, name: p.name }, ...(short !== p.name && short.split(" ").length >= 2 ? [{ id: p.id, name: short }] : [])];
});
const PERSONA_LABELS = Object.values(PERSONA_BY_VALUE).map((d) => d.label);
const BANNED = /\b(only|just|behind|should have|can['’]t afford|cannot afford|waste)\b/gi;
const INVEST = /\b(invest(ing|ment|ments|or)?|stocks?|etfs?|index funds?|mutual funds?|roth|401\(?k\)?|crypto|bitcoin|brokerage|tax(es)?)\b/i;
// Sprout is a prototype built for FNB, not FNB: "our <FNB product>" is a naming slip too.
const FNB_NAMING = /First National Bank|F\.N\.B\.|\bFnb\b|\bfnb\b|\b[Oo]ur (?:FNB|free|Mortgage|Credit|Learning|Student|FirstRate|Savers|Freestyle|SmartSecured|Knowledge|Home Ownership|CardGuard)\b/;
const numbersIn = (s: string) => (s.match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map((t) => Number(t.replace(/,/g, ""))).filter(Number.isFinite);
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
const sentences = (s: string) => s.trim().split(/(?<=[.!?])\s+/).filter(Boolean);
const clip = (s: string, n = 160) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
// The phrase around a match, so a flag shows the offending words rather than the start of the field.
function around(text: string, re: RegExp) {
  const m = new RegExp(re.source, re.flags.replace("g", "")).exec(text);
  if (!m) return clip(text);
  const from = Math.max(0, m.index - 60);
  const to = m.index + m[0].length + 60;
  return `${from > 0 ? "…" : ""}${text.slice(from, to)}${to < text.length ? "…" : ""}`;
}

function allowedFrom(...sources: unknown[]) {
  const allowed = new Set<number>([0, 1, 2, 3]);
  for (const n of numbersIn(JSON.stringify(sources))) [n, Math.round(n), Math.floor(n)].forEach((x) => allowed.add(x));
  return allowed;
}

interface Flag {
  type: string;
  detail: string;
}

// Checks every AI-facing text: banned words, investing/tax advice without the advisor handoff,
// "emergency fund", months where years are required, FNB naming, products the plan doesn't hold.
function textFlags(field: string, text: string, planProductIds: Set<string>, allowAdvisorLine = true, termsText = ""): Flag[] {
  const out: Flag[] = [];
  const banned = [...new Set((text.match(BANNED) ?? []).map((w) => w.toLowerCase()))];
  if (banned.length) out.push({ type: "banned words", detail: `${field}: ${banned.join(", ")} · "${around(text, BANNED)}"` });
  for (const s of sentences(text)) {
    if (INVEST.test(s) && !(allowAdvisorLine && /advisor/i.test(s))) out.push({ type: "investing/tax advice", detail: `${field}: "${clip(s)}"` });
  }
  if (/emergency fund/i.test(text)) out.push({ type: '"emergency fund" not "safety cushion"', detail: `${field}: "${around(text, /emergency fund/i)}"` });
  // Ranges like a CD's "3 to 48 months" are product terms, not durations.
  const longMonths = [...text.matchAll(/\b(\d+)\s*months?\b/gi)].find(
    (m) => Number(m[1]) >= 24 && !/\d\s*(?:to|-|–|and)\s*$/.test(text.slice(Math.max(0, (m.index ?? 0) - 12), m.index)),
  );
  if (longMonths) out.push({ type: "months where years are required", detail: `${field}: "${around(text, new RegExp(`\\b${longMonths[1]}\\s*months?\\b`, "i"))}"` });
  if (/10\+\s*years/i.test(text)) out.push({ type: "months where years are required", detail: `${field}: "${around(text, /10\+\s*years/i)}"` });
  if (FNB_NAMING.test(text)) out.push({ type: "FNB naming", detail: `${field}: "${around(text, FNB_NAMING)}"` });
  const lower = text.toLowerCase();
  // A name inside a longer plan product's name ("Secured Line of Credit" in "Business Unsecured Line of Credit") is not a mention.
  const planNames = productNames.filter((p) => planProductIds.has(p.id) && lower.includes(p.name.toLowerCase())).map((p) => p.name.toLowerCase());
  const wrong = [
    ...new Set(
      productNames
        .filter(
          (p) =>
            lower.includes(p.name.toLowerCase()) &&
            !planProductIds.has(p.id) &&
            !planNames.some((n) => n !== p.name.toLowerCase() && n.includes(p.name.toLowerCase())) &&
            // A product named inside this product's own published terms ("free on Student Checking") is a fee fact.
            !termsText.toLowerCase().includes(p.name.toLowerCase()),
        )
        .map((p) => p.name),
    ),
  ];
  if (wrong.length) out.push({ type: "contradiction: product not in plan", detail: `${field}: ${wrong.join(", ")}` });
  return out;
}

// "on track" said about the P1 goal the engine has off track (no conditional); "$N a month away" that isn't a real gap.
const CONDITIONAL = /\b(if|would|could|move|moving|turn|get|put|puts|stay|keep|once|by|when|to be|away from|from being)\b/i;
// Goal words used to tell which goal an "on track" clause is about.
const GOAL_WORDS: [GoalId, RegExp][] = [
  ["travel", /\b(travel|trip|japan|abroad|vacation)\b/i],
  ["first_home", /\b(home|house|place)\b/i],
  ["education", /\b(education|school|course)/i],
  ["small_business", /\b(business|shop)\b/i],
  ["family", /\bfamily\b/i],
  ["emergency_fund", /\bcushion\b/i],
];

function trackFlags(field: string, text: string, p1OnTrack: boolean | null, plan?: Plan): Flag[] {
  const out: Flag[] = [];
  if (plan && !gapClaimsConsistent(text, plan)) out.push({ type: "contradiction: on track vs gap", detail: `${field} claims a gap the engine doesn't have: "${clip(text)}"` });
  if (p1OnTrack === null) return out;
  // Clause-aware: "first home is $4 a month away, and your small business goal is on track" is about two goals.
  for (const clause of text.split(/(?<=[.!?])\s+|,\s*|;\s*|\s+(?:and|but)\s+/)) {
    if (!/\bon track\b/i.test(clause) || CONDITIONAL.test(clause)) continue;
    const named = GOAL_WORDS.filter(([, re]) => re.test(clause)).map(([id]) => id);
    const offTrack = named.length
      ? named.some((id) => plan?.allocation.find((a) => a.goalId === id)?.onTrack === false)
      : !p1OnTrack;
    if (offTrack) out.push({ type: "contradiction: on track vs gap", detail: `${field} says on track, engine has a gap: "${clip(clause)}"` });
  }
  return out;
}

// ---------- plan audit ----------
interface PlanItem {
  user: User;
  profile: GoalProfile;
  plan: Plan;
  aiUsed: boolean;
  profileAiUsed: boolean;
  fallbackReason?: string;
  rejectedFields: number; // AI fields the number/voice/consistency guards or text budget replaced with the template
  profileMs: number;
  planMs: number;
  flags: Flag[];
}

async function auditPlan(user: User): Promise<PlanItem> {
  const t0 = Date.now();
  const profileResult = await generateProfile(user.intake);
  const profileMs = Date.now() - t0;
  const profile = profileResult.profile;
  const skeleton = buildPlanSkeleton(profile, user.snapshot, user.intake);
  let raw: AiPlanText | null = null;
  let facts: unknown = null;
  const t1 = Date.now();
  const result = await generatePlan(skeleton, profile, {
    onRaw: (ai, f) => {
      raw = ai;
      facts = f;
    },
  });
  const planMs = Date.now() - t1;
  const plan = result.plan;
  const flags: Flag[] = [];

  if (!result.aiUsed) flags.push({ type: "fallback used", detail: `plan: ${result.fallbackReason ?? "unknown"}` });
  if (!profileResult.aiUsed) flags.push({ type: "fallback used", detail: `profile: ${profileResult.fallbackReason ?? "unknown"}` });
  if (planMs > LATENCY_LIMIT_MS) flags.push({ type: "latency > 20 s", detail: `plan ${Math.round(planMs / 100) / 10} s` });

  const expectedPersona = personaFromValues(user.intake.values).label;
  if (profile.persona.label !== expectedPersona) flags.push({ type: "persona label altered", detail: `${profile.persona.label} vs ${expectedPersona}` });
  if (plan.stepOne.title !== skeleton.stepOne.title || plan.stepOne.detail !== skeleton.stepOne.detail) {
    flags.push({ type: "stepOne altered", detail: `"${clip(plan.stepOne.title)}"` });
  }

  const productIds = new Set([...plan.matches.map((m) => m.productId), ...plan.steps.flatMap((s) => (s.productId ? [s.productId] : [])), ...(plan.stepOne.productId ? [plan.stepOne.productId] : [])]);
  const p1 = [...profile.goals].sort((a, b) => a.priority - b.priority).find((g) => plan.allocation.some((a) => a.goalId === g.id));
  const p1OnTrack = p1 ? (plan.allocation.find((a) => a.goalId === p1.id)?.onTrack ?? null) : null;

  // Profile text (AI-written when profileAiUsed): never products or rates.
  for (const [field, text] of [["personaDescription", profile.persona.description], ["richLifeStatement", profile.richLifeStatement]] as const) {
    flags.push(...textFlags(field, text, new Set()));
    for (const other of PERSONA_LABELS) if (other !== expectedPersona && text.includes(other)) flags.push({ type: "persona label altered", detail: `${field} names ${other}` });
  }

  // What the user sees (final text, after guards).
  const shown: [string, string][] = [
    ["headline", plan.headline],
    ["sproutSays", plan.sproutSays],
    ...plan.matches.map((m): [string, string] => [`explanation:${m.productId}`, m.explanation]),
    ...plan.steps.filter((s) => s.order !== 1).flatMap((s): [string, string][] => [[`step${s.order}.title`, s.title], [`step${s.order}.detail`, s.detail]]),
    ["bankerSummary", plan.bankerSummary],
  ];
  const termsOf = (field: string) => {
    const id = field.startsWith("explanation:") ? field.slice("explanation:".length) : null;
    const m = id ? plan.matches.find((x) => x.productId === id) : undefined;
    return m ? [...m.termsToKnow, ...(catalog.find((p) => p.id === m.productId)?.keyTerms ?? [])].join(" ") : "";
  };
  for (const [field, text] of shown) flags.push(...textFlags(field, text, productIds, true, termsOf(field)));
  flags.push(...trackFlags("headline", plan.headline, p1OnTrack, plan), ...trackFlags("sproutSays", plan.sproutSays, p1OnTrack, plan));
  if (words(plan.headline) > 10) flags.push({ type: "headline > 10 words", detail: `"${clip(plan.headline)}"` });
  if (words(plan.sproutSays) > 35) flags.push({ type: "sproutSays > 35 words", detail: `${words(plan.sproutSays)} words` });
  for (const m of plan.matches) {
    const first = sentences(m.explanation)[0] ?? "";
    if (words(first) > 20) flags.push({ type: "explanation first sentence > 20 words", detail: `${m.productId}: ${words(first)} words` });
    if (m.stage === "later" && /\b(open|start|get)\b[^.]*\b(today|right now|this week|right away)\b/i.test(m.explanation)) {
      flags.push({ type: "contradiction: wrong stage", detail: `later ${m.productId}: "${clip(m.explanation)}"` });
    }
    if (m.stage === "now" && /\bunlocks? (when|once|after)\b/i.test(m.explanation)) flags.push({ type: "contradiction: wrong stage", detail: `now ${m.productId}: "${clip(m.explanation)}"` });
  }

  // Raw AI wording vs the facts: numbers the model invented, and whether the guard kept the template.
  if (raw && facts) {
    const r = raw as AiPlanText;
    const allowed = allowedFrom(facts);
    const pairs: [string, string, string, string][] = [
      ["headline", r.headline, plan.headline, skeleton.headline],
      ["sproutSays", r.sproutSays, plan.sproutSays, skeleton.sproutSays],
      ...r.explanations.map((e): [string, string, string, string] => [
        `explanation:${e.productId}`,
        e.explanation,
        plan.matches.find((m) => m.productId === e.productId)?.explanation ?? "",
        skeleton.matches.find((m) => m.productId === e.productId)?.explanation ?? "",
      ]),
      ["bankerSummary", r.bankerSummary, plan.bankerSummary, skeleton.bankerSummary],
    ];
    for (const [field, aiText, finalText, template] of pairs) {
      const unknown = [...new Set(numbersIn(aiText).filter((n) => !allowed.has(n)))];
      if (unknown.length) {
        const caught = finalText === voiceNormalize(template);
        flags.push({ type: "number not in facts", detail: `${field}: ${unknown.join(", ")} (guard ${caught ? "caught it" : "MISSED it"})` });
      }
    }
  }

  return { user, profile, plan, aiUsed: result.aiUsed, profileAiUsed: profileResult.aiUsed, fallbackReason: result.fallbackReason, rejectedFields: result.rejectedFields ?? 0, profileMs, planMs, flags };
}

// ---------- chat audit ----------
const KINDS: ChatIntent["kind"][] = ["why_step_one", "how_split", "why_cushion", "why_product", "product_fees", "when_unlock", "goal_gap", "what_if", "free"];
const TYPED: { question: string; history?: ChatTurn[] }[] = [
  { question: "Can I put my savings in index funds or crypto?" },
  { question: "What if I save $25 more a month?" },
  { question: "Should I get a credit card now?" },
  { question: "Why is my safety cushion this size?" },
  {
    question: "What about $40 instead?",
    history: [
      { role: "user", text: "What if I save $60 more a month?" },
      { role: "sprout", text: "Here's how that changes your plan." },
    ],
  },
  { question: "Do I have to pay taxes on my savings interest?" },
];

interface ChatItem {
  user: string;
  intent: ChatIntent["kind"];
  chip: string;
  route: string;
  aiUsed: boolean;
  ms: number;
  answer: string;
  flags: Flag[];
}

function chipPool(item: PlanItem): Chip[] {
  const { plan, profile, user } = item;
  const b = blockChips(plan, profile, user.snapshot);
  const blocks = [b.nextMove, b.fnbFit, b.month, b.cushion, ...Object.values(b.goals), ...Object.values(b.path)].flatMap((c) => c ?? []);
  const followUps = KINDS.flatMap((kind) =>
    followUpChips(
      kind === "why_product" || kind === "product_fees"
        ? { kind, productId: plan.matches[0]?.productId }
        : kind === "goal_gap" || kind === "what_if"
          ? { kind, goalId: plan.allocation[0]?.goalId, amount: 50 }
          : { kind },
      plan,
      profile,
      user.snapshot,
    ),
  );
  return [...starterChips(plan, profile, user.snapshot), ...blocks, ...followUps];
}

async function auditChat(item: PlanItem, intent: ChatIntent["kind"], question: string, chipIntent: ChatIntent | undefined, history: ChatTurn[]): Promise<ChatItem> {
  const { plan, profile, user } = item;
  let raw: string | null = null;
  let facts: unknown = null;
  const t0 = Date.now();
  const r = await answerQuestion(question, profile, plan, {
    snapshot: user.snapshot,
    history,
    intent: chipIntent,
    onRaw: (a, f) => {
      raw = a;
      facts = f;
    },
  });
  const ms = Date.now() - t0;
  const flags: Flag[] = [];
  const deterministic = r.route === "boundary" || r.route === "rate";
  if (!r.aiUsed && !deterministic) flags.push({ type: "fallback used", detail: r.fallbackReason ?? "unknown" });
  if (ms > LATENCY_LIMIT_MS) flags.push({ type: "latency > 20 s", detail: `${Math.round(ms / 100) / 10} s` });
  if (raw !== null) {
    const userTyped = [question, ...history.filter((t) => t.role === "user").map((t) => t.text)];
    const allowed = allowedFrom(facts, userTyped);
    const unknown = [...new Set(numbersIn(raw).filter((n) => !allowed.has(n)))];
    if (unknown.length) flags.push({ type: "number not in facts", detail: `${unknown.join(", ")} (guard ${r.aiUsed ? "MISSED it" : "caught it"})` });
  }
  if (r.aiUsed && words(r.answer) > 70) flags.push({ type: "chat answer > 70 words", detail: `${words(r.answer)} words` });
  const productIds = new Set([...plan.matches.map((m) => m.productId), ...(plan.stepOne.productId ? [plan.stepOne.productId] : [])]);
  flags.push(...textFlags("answer", r.answer, productIds, true));
  // Contradictions with the engine: on-track wording against the goal's allocation or the what-if result.
  const goalId = chipIntent?.goalId;
  if (intent === "goal_gap" && goalId) {
    const a = plan.allocation.find((x) => x.goalId === goalId);
    if (a) flags.push(...trackFlags("answer", r.answer, a.onTrack, plan));
  }
  if (intent === "what_if" && chipIntent?.amount !== undefined) {
    const w = whatIfFor(goalId, Math.round(chipIntent.amount), profile, plan, user.snapshot);
    if (w && !w.cushion && !w.onTrackAfter && /\b(puts it on track|you'?re on track|it'?s on track|now on track)\b/i.test(r.answer)) {
      flags.push({ type: "contradiction: on track vs gap", detail: `what-if says on track, engine says not: "${clip(r.answer)}"` });
    }
  }
  return { user: user.id, intent, chip: question, route: r.route, aiUsed: r.aiUsed, ms, answer: r.answer, flags };
}

function chatPlan(items: PlanItem[]) {
  const usable = items.filter((i) => i.plan.allocation.length > 0 || i.plan.matches.length > 0);
  const jobs: { item: PlanItem; intent: ChatIntent["kind"]; question: string; chipIntent?: ChatIntent; history: ChatTurn[] }[] = [];
  const used = new Set<string>();
  let typed = 0;
  for (let j = 0; jobs.length < CHATS && j < CHATS * 6; j++) {
    const kind = KINDS[j % KINDS.length];
    const item = usable[j % usable.length];
    if (!item) break;
    if (kind === "free") {
      const t = TYPED[typed++ % TYPED.length];
      jobs.push({ item, intent: "free", question: t.question, history: t.history ?? [] });
      continue;
    }
    const chip = chipPool(item).find((c) => c.intent.kind === kind && !used.has(`${item.user.id}|${c.question}`));
    if (!chip) continue;
    used.add(`${item.user.id}|${chip.question}`);
    jobs.push({ item, intent: kind, question: chip.question, chipIntent: chip.intent, history: [] });
  }
  return jobs;
}

async function inBatches<T, R>(xs: T[], size: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < xs.length; i += size) out.push(...(await Promise.all(xs.slice(i, i + size).map(fn))));
  return out;
}

// ---------- report ----------
const cell = (s: string) => s.replace(/\|/g, "\\|").replace(/\s*\n\s*/g, " ").trim();
const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);

function flagCounts(all: Flag[][]) {
  const counts = new Map<string, { items: number; examples: string[] }>();
  for (const flags of all) {
    for (const type of new Set(flags.map((f) => f.type))) {
      const entry = counts.get(type) ?? { items: 0, examples: [] };
      entry.items++;
      if (entry.examples.length < 2) entry.examples.push(flags.find((f) => f.type === type)!.detail);
      counts.set(type, entry);
    }
  }
  return [...counts.entries()].sort((a, b) => b[1].items - a[1].items);
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log("ANTHROPIC_API_KEY not set; this audit needs live AI.");
    process.exit(1);
  }
  const users = sample();
  const started = Date.now();
  const plans = await inBatches(users, PLAN_CONCURRENCY, auditPlan);
  const jobs = chatPlan(plans);
  const chats = await inBatches(jobs, CHAT_CONCURRENCY, (j) => auditChat(j.item, j.intent, j.question, j.chipIntent, j.history));

  const planFallbacks = plans.filter((p) => !p.aiUsed).length;
  const profileFallbacks = plans.filter((p) => !p.profileAiUsed).length;
  const chatFallbacks = chats.filter((c) => c.flags.some((f) => f.type === "fallback used")).length;
  const fallbackRate = (planFallbacks + chatFallbacks) / Math.max(1, plans.length + chats.length);
  const planCounts = flagCounts(plans.map((p) => p.flags));
  const chatCounts = flagCounts(chats.map((c) => c.flags));

  const lines: string[] = [
    `# AI audit (cycle ${CYCLE})`,
    "",
    `Generated ${new Date().toISOString()} by \`scripts/ai-audit.ts\` (#121), seed ${SEED}. Plan model \`${getModel()}\`, profile model \`${process.env.ANTHROPIC_PROFILE_MODEL || "claude-haiku-5-5"}\`.`,
    `Sample: ${plans.length} users (3 rotating scenarios + generated users stratified by life stage, persona, surplus, FNB customer) through the real profile + plan pipeline, then ${chats.length} Ask Sprout answers across all intents. Live AI. Synthetic users only.`,
    "",
    "## Summary",
    "",
    `- Plans: ${plans.length} built, ${planFallbacks} plan fallbacks, ${profileFallbacks} profile fallbacks, ${plans.reduce((t, p) => t + p.rejectedFields, 0)} AI fields kept the template (guards or text budget), average plan latency ${(avg(plans.map((p) => p.planMs)) / 1000).toFixed(1)} s, profile ${(avg(plans.map((p) => p.profileMs)) / 1000).toFixed(1)} s.`,
    `- Chats: ${chats.length} answers, ${chatFallbacks} fallbacks (boundary and rate answers are deterministic by design), average latency ${(avg(chats.map((c) => c.ms)) / 1000).toFixed(1)} s.`,
    `- Fallback rate (plans + chats): ${(fallbackRate * 100).toFixed(1)}%.`,
    `- Wall time ${Math.round((Date.now() - started) / 1000)} s.`,
    "",
    "### Plan flags (items affected)",
    "",
    "| Flag | Items | Examples |",
    "|---|---|---|",
    ...planCounts.map(([type, e]) => `| ${cell(type)} | ${e.items} | ${e.examples.map(cell).join("<br>")} |`),
    "",
    "### Chat flags (items affected)",
    "",
    "| Flag | Items | Examples |",
    "|---|---|---|",
    ...chatCounts.map(([type, e]) => `| ${cell(type)} | ${e.items} | ${e.examples.map(cell).join("<br>")} |`),
    "",
    "## Plans",
    "",
    "| User | Life stage | Persona | Surplus | Customer | AI | Plan s | Headline | Flags |",
    "|---|---|---|---|---|---|---|---|---|",
    ...plans.map(
      (p) =>
        `| ${p.user.id} | ${p.user.strata.lifeStage} | ${p.user.strata.persona} | ${p.plan.monthlySurplus > 0 ? "yes" : "no"} | ${p.user.strata.customer ? "yes" : "no"} | ${p.aiUsed ? "yes" : "**no**"} | ${(p.planMs / 1000).toFixed(1)} | ${cell(p.plan.headline)} | ${p.flags.map((f) => `**${cell(f.type)}**: ${cell(f.detail)}`).join("<br>")} |`,
    ),
    "",
    "## Chats",
    "",
    "| User | Intent | Question | Route | AI | s | Answer | Flags |",
    "|---|---|---|---|---|---|---|---|",
    ...chats.map(
      (c) =>
        `| ${c.user} | ${c.intent} | ${cell(c.chip)} | ${c.route} | ${c.aiUsed ? "yes" : "**no**"} | ${(c.ms / 1000).toFixed(1)} | ${cell(clip(c.answer, 260))} | ${c.flags.map((f) => `**${cell(f.type)}**: ${cell(f.detail)}`).join("<br>")} |`,
    ),
    "",
  ];
  writeFileSync(OUT, lines.join("\n"));

  // Counts only: no user text or numbers on the console.
  console.log(
    JSON.stringify({
      cycle: CYCLE,
      plans: plans.length,
      chats: chats.length,
      planFallbacks,
      profileFallbacks,
      fieldsKeptTemplate: plans.reduce((t, p) => t + p.rejectedFields, 0),
      chatFallbacks,
      fallbackRatePct: Math.round(fallbackRate * 1000) / 10,
      avgPlanMs: avg(plans.map((p) => p.planMs)),
      avgChatMs: avg(chats.map((c) => c.ms)),
      planFlags: Object.fromEntries(planCounts.map(([t, e]) => [t, e.items])),
      chatFlags: Object.fromEntries(chatCounts.map(([t, e]) => [t, e.items])),
      out: OUT,
    }),
  );
}

void main();
