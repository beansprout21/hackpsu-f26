// "Why?" / "What if?" answers grounded in the user's plan (issue #6). Numbers come from engine
// math (what-if) or the plan itself; the AI only phrases them. Rate and advice-boundary
// questions are answered deterministically so Sprout never invents a rate or gives investing advice.
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { GoalId, GoalProfile, Plan, Product } from "@/types";
import { getProduct, isCatalogId } from "@/lib/server/catalog";
import { GOAL_LABELS } from "@/lib/server/engine/defaults";
import { monthsToTarget } from "@/lib/server/engine/math";
import { describeAiError, getClient, getModel } from "./client";
import { VOICE_RULES } from "./plan";

const CHAT_TIMEOUT_MS = 15_000;
const ADVISOR_LINE = "When you're ready for that, an FNB advisor can help.";

export interface ChatAnswer {
  answer: string;
  citedProductIds: string[];
}
export interface ChatResult extends ChatAnswer {
  aiUsed: boolean;
  route: "boundary" | "rate" | "what_if" | "general";
  fallbackReason?: string;
}

const CHAT_SYSTEM = [
  "You are Sprout, a warm, optimistic money coach for college students and young families, built as a prototype for FNB. Follow the voice rules.",
  "Answer the user's question about THEIR plan in 1 to 4 short sentences. Use only the facts and numbers in the JSON. If a whatIf result is given, use exactly those numbers and never do your own arithmetic.",
  "Never invent rates, fees, or products. If a rate isn't published, say to check the current rate with FNB.",
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

// Voice rule 3: "just" is dropped (meaning-safe); any other banned word falls back to the template.
const BANNED_OTHER = /\b(only|behind|should have|can't afford|cannot afford|waste)\b/i;
function voiceSafe(text: string): string | null {
  const softened = text.replace(/\bjust\s+/gi, "").replace(/\s+/g, " ").trim();
  return BANNED_OTHER.test(softened) ? null : softened;
}

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const clean = (s: string, max: number) => s.replace(/\s+/g, " ").trim().slice(0, max);

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
}

export function parseWhatIf(question: string, profile: GoalProfile, plan: Plan): WhatIf | null {
  const amount = question.match(/\$\s?(\d[\d,]*(?:\.\d+)?)|(\d[\d,]*(?:\.\d+)?)\s*(?:dollars|bucks)?\s*(?:more|less|extra|fewer)?\s*(?:a|per|each|every|\/)\s*(?:month|mo)\b/i);
  if (!amount) return null;
  if (!/\b(what if|if i|save|put|add|extra|more|less|move|cut)\b/i.test(question)) return null;
  const value = Number((amount[1] ?? amount[2]).replace(/,/g, ""));
  if (!Number.isFinite(value) || value <= 0) return null;
  const sign = /\b(less|fewer|cut|reduce|lower)\b/i.test(question) ? -1 : 1;

  const planned = new Set(plan.allocation.map((a) => a.goalId));
  const named = GOAL_WORDS.find(([id, re]) => planned.has(id) && re.test(question))?.[0];
  const p1 = [...profile.goals].sort((a, b) => a.priority - b.priority).find((g) => planned.has(g.id))?.id;
  const goalId = named ?? p1;
  if (!goalId) return null;

  const alloc = plan.allocation.find((a) => a.goalId === goalId);
  const goal = profile.goals.find((g) => g.id === goalId);
  if (!alloc || !goal) return null;
  // Same target the engine used: the cushion target for the emergency fund, else the goal target.
  const targetAmount = goalId === "emergency_fund" ? plan.cushionTarget : goal.targetAmount;
  const deltaMonthly = sign * Math.round(value);
  const newMonthly = Math.max(0, alloc.monthlyAmount + deltaMonthly);
  const guiltFree = plan.spendingPlan.find((b) => b.bucket === "guilt_free")?.monthlyAmount ?? 0;
  const guiltFreeAfter = Math.max(0, guiltFree - Math.max(0, deltaMonthly));
  return {
    goalId,
    goalLabel: GOAL_LABELS[goalId],
    deltaMonthly,
    currentMonthly: alloc.monthlyAmount,
    newMonthly,
    targetAmount,
    requiredMonthly: alloc.requiredMonthly,
    currentMonthsToTarget: alloc.monthsToTarget,
    newMonthsToTarget: monthsToTarget(targetAmount, 0, newMonthly),
    onTrackAfter: newMonthly >= alloc.requiredMonthly,
    guiltFreeAfter,
    guiltFreeStaysAbove10Percent: guiltFreeAfter >= 0.1 * plan.effectiveMonthlyIncome,
  };
}

function whatIfTemplate(w: WhatIf): string {
  if (w.newMonthly <= 0) return `With ${usd(w.newMonthly)} a month, your ${w.goalLabel} goal pauses. Even a small automatic amount keeps it moving.`;
  const more = w.deltaMonthly > 0;
  const lead = more
    ? `Saving ${usd(w.deltaMonthly)} more a month gives your ${w.goalLabel} goal ${usd(w.newMonthly)} a month.`
    : `Saving ${usd(-w.deltaMonthly)} less a month leaves your ${w.goalLabel} goal ${usd(w.newMonthly)} a month.`;
  const timing = `That reaches ${usd(w.targetAmount)} in ${w.newMonthsToTarget} months, instead of ${w.currentMonthsToTarget}.`;
  const status = w.onTrackAfter ? "That puts it on track." : `It needs ${usd(w.requiredMonthly)} a month to stay on schedule.`;
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

// ---------- AI ----------
function chatFacts(question: string, profile: GoalProfile, plan: Plan, whatIf: WhatIf | null) {
  return {
    question,
    whatIf,
    persona: profile.persona.label,
    goals: profile.goals.map((g) => {
      const a = plan.allocation.find((x) => x.goalId === g.id);
      return { id: g.id, label: GOAL_LABELS[g.id], why: g.why, motivation: g.motivation, targetAmount: g.targetAmount, horizonMonths: g.horizonMonths, allocation: a ?? null };
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
        goal: GOAL_LABELS[m.goalId],
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

function numbersAllowed(text: string, facts: unknown): boolean {
  const allowed = new Set<string>(["0", "1", "2", "3"]);
  for (const raw of JSON.stringify(facts).match(/\d[\d,]*(?:\.\d+)?/g) ?? []) {
    const n = Number(raw.replace(/,/g, ""));
    if (!Number.isFinite(n)) continue;
    allowed.add(String(n));
    allowed.add(String(Math.round(n)));
    allowed.add(String(Math.floor(n)));
  }
  return (text.match(/\d[\d,]*(?:\.\d+)?/g) ?? []).every((t) => allowed.has(String(Number(t.replace(/,/g, "")))));
}

async function aiAnswer(facts: ReturnType<typeof chatFacts>): Promise<ChatAnswer> {
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
      messages: [{ role: "user", content: JSON.stringify(facts, null, 2) }],
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
    answer: `Your plan starts with one step: ${plan.stepOne.title}. ${plan.sproutSays}`,
    citedProductIds: plan.stepOne.productId ? [plan.stepOne.productId] : [],
  };
}

// citedProductIds: only real catalog products that are in this plan.
function keepCited(ids: string[], plan: Plan): string[] {
  const inPlan = new Set(planProducts(plan).map((p) => p.id));
  return [...new Set(ids)].filter((id) => isCatalogId(id) && inPlan.has(id));
}

export async function answerQuestion(question: string, profile: GoalProfile, plan: Plan): Promise<ChatResult> {
  const q = clean(question, 500);
  if (BOUNDARY.test(q)) {
    return { answer: ADVISOR_LINE, citedProductIds: [], aiUsed: false, route: "boundary" };
  }
  const named = mentionedProducts(q, plan);
  if (RATE.test(q) && named.length) {
    return { ...rateAnswer(named), aiUsed: false, route: "rate" };
  }

  const whatIf = parseWhatIf(q, profile, plan);
  const route = whatIf ? "what_if" : "general";
  const fallback = whatIf ? { answer: whatIfTemplate(whatIf), citedProductIds: [] } : generalFallback(q, plan);
  try {
    const facts = chatFacts(q, profile, plan, whatIf);
    const ai = await aiAnswer(facts);
    const raw = clean(ai.answer, 700);
    if (!raw) throw new Error("empty answer");
    if (!numbersAllowed(raw, facts)) throw new Error("number guard");
    const answer = voiceSafe(raw);
    if (!answer) throw new Error("voice guard");
    return { answer, citedProductIds: keepCited(ai.citedProductIds, plan), aiUsed: true, route };
  } catch (error) {
    return { ...fallback, citedProductIds: keepCited(fallback.citedProductIds, plan), aiUsed: false, route, fallbackReason: describeAiError(error) };
  }
}
