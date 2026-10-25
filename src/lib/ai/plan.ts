// Engine Plan -> Plan with AI-written text (docs/SPROUT.md v3, Plan prompt contract). The AI
// rewrites words only (headline, sproutSays, step wording, match explanations, banker summary).
// Amounts, buckets, stages, triggers, levers, product ids, and Step one (choice AND text) stay
// exactly as the engine produced them. AI text falls back to the template when it cites a number
// the engine didn't produce, breaks a voice rule, or exceeds the docs/DASHBOARD.md text budget.
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { GoalProfile, Plan } from "@/types";
import { PlanSchema } from "@/types/schemas";
import { getProduct, isCatalogId } from "@/lib/server/catalog";
import { aboutTime } from "@/lib/client/time";
import { describeAiError, getClient, getModel } from "./client";
import { gapClaimsConsistent, goalWord, voiceNormalize, voiceSafe } from "./voice";

const PLAN_TIMEOUT_MS = 20_000;

// docs/SPROUT.md "Sprout's voice", shared with /api/profile.
export const VOICE_RULES = [
  "Voice rules:",
  '1. Possibility first ("Japan is $140 a month away", never "You can\'t afford Japan").',
  '2. A number and a date ("$113 a month covers your first month of costs in 3 months").',
  "3. Never shame. Never use these words: only, just, behind, should have, can't afford, waste.",
  "4. Plain and short: under 20 words per sentence; explain jargon in 5 words (\"APY, the interest you earn\").",
  "5. Spend on what you love: celebrate their top dial, trim what they don't care about.",
  '6. Systems over willpower: "automate it", not "try to remember".',
  "7. Big wins over small cuts. Never tell a student to skip coffee.",
  "8. Honest: no promised outcomes, no invented rates, weak rates called weak.",
  "9. Warm, a little playful. At most one plant metaphor.",
].join("\n");

const PLAN_SYSTEM = [
  "You are Sprout, a warm, optimistic money coach for college students and young families, built as a prototype for FNB. Follow the voice rules.",
  "You receive a finished plan from Sprout's engine. You only write words. Never change any number, stage, lever, or product. Step one is final, text included: never write it.",
  "Stay within budgeting, saving, credit building, and FNB products; for investing or taxes say an FNB advisor can help. Output JSON only.",
  'Always call the emergency savings the "safety cushion", never just "cushion" and never "emergency fund".',
  "Durations: under 24 months say months; from 24 months say whole years, written the way the JSON's *Time fields are (\"about 4 years\"). Never write 24 or more months.",
  "",
  VOICE_RULES,
].join("\n");

// No stepOne here on purpose (SPROUT.md v3 rule D): the AI is never asked for it, and the merge keeps the engine's.
const AiPlanTextSchema = z.object({
  headline: z.string(),
  sproutSays: z.string(),
  explanations: z.array(z.object({ productId: z.string(), explanation: z.string() })),
  steps: z.array(z.object({ order: z.number(), title: z.string(), detail: z.string() })),
  bankerSummary: z.string(),
});
export type AiPlanText = z.infer<typeof AiPlanTextSchema>;

export interface PlanResult {
  plan: Plan;
  aiUsed: boolean;
  fallbackReason?: string;
  rejectedFields?: number;
}

const clean = (s: string | undefined, max: number) => (s ?? "").replace(/\s+/g, " ").trim().slice(0, max);

// docs/DASHBOARD.md "AI text budget": over-budget AI text keeps the template, like a wrong number.
export const TEXT_BUDGET = { headlineWords: 10, sproutSaysSentences: 2, sproutSaysWords: 35, explanationFirstSentenceWords: 20 };
export const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
export const sentencesOf = (s: string) => s.trim().split(/(?<=[.!?])\s+/).filter(Boolean);
const withinHeadlineBudget = (s: string) => wordCount(s) <= TEXT_BUDGET.headlineWords;
const withinSproutSaysBudget = (s: string) =>
  sentencesOf(s).length <= TEXT_BUDGET.sproutSaysSentences && wordCount(s) <= TEXT_BUDGET.sproutSaysWords;
const withinExplanationBudget = (s: string) => wordCount(sentencesOf(s)[0] ?? "") <= TEXT_BUDGET.explanationFirstSentenceWords;

// SPROUT.md v3: the user-facing name is always "safety cushion", so a bare "cushion" in AI text is renamed.
export const safetyCushionName = (s: string) =>
  s.replace(/(?<!safety[ -])\b(c)ushion\b/gi, (_m, c: string) => (c === "C" ? "Safety cushion" : "safety cushion"));

// Server-side guard: only catalog products survive, whatever produced the plan.
export function dropUnknownProducts(plan: Plan): Plan {
  const stripId = <T extends { productId?: string }>(x: T): T => {
    if (!x.productId || isCatalogId(x.productId)) return x;
    const copy = { ...x };
    delete copy.productId;
    return copy;
  };
  return {
    ...plan,
    stepOne: stripId(plan.stepOne),
    matches: plan.matches.filter((m) => isCatalogId(m.productId)),
    steps: plan.steps.map(stripId),
    notYet: plan.notYet.map(stripId),
  };
}

function planFacts(skeleton: Plan, profile: GoalProfile) {
  const name = (id?: string) => (id ? getProduct(id)?.name : undefined);
  return {
    persona: profile.persona.label,
    topValues: profile.topValues,
    richLifeStatement: profile.richLifeStatement,
    goals: profile.goals.map((g) => {
      const a = skeleton.allocation.find((x) => x.goalId === g.id);
      return {
        id: g.id,
        label: goalWord(g.id),
        priority: g.priority,
        why: g.why,
        motivation: g.motivation,
        targetAmount: g.targetAmount,
        horizonMonths: g.horizonMonths,
        horizonTime: aboutTime(g.horizonMonths),
        monthlyAmount: a?.monthlyAmount ?? 0,
        timeAtPace: a && a.monthsToTarget > 0 ? aboutTime(a.monthsToTarget) : null,
        requiredMonthly: a?.requiredMonthly ?? null,
        onTrack: a?.onTrack ?? null,
        gapMonthly: a && !a.onTrack ? Math.round(a.requiredMonthly - a.monthlyAmount) : null,
        // Durations as *Time strings only (#121 cycle 3): no raw month counts for the model to echo.
        levers: (a?.levers ?? []).map((l) => (l.kind === "more_time" ? { kind: l.kind, newHorizonTime: aboutTime(l.newHorizonMonths) } : l)),
      };
    }),
    money: {
      effectiveMonthlyIncome: skeleton.effectiveMonthlyIncome,
      monthlySurplus: skeleton.monthlySurplus,
      fixedSharePercent: Math.round(skeleton.fixedShare * 100),
      cushionTarget: skeleton.cushionTarget,
      cushionFillsInTime: skeleton.cushionFillsInMonths ? aboutTime(skeleton.cushionFillsInMonths) : null,
      threeMonthCushion: skeleton.emergencyFundTarget,
      spendingPlan: skeleton.spendingPlan.map((b) => ({ bucket: b.bucket, monthlyAmount: b.monthlyAmount, percent: Math.round(b.percent) })),
      futureYou: skeleton.futureYou,
    },
    stepOne: { title: skeleton.stepOne.title, detail: skeleton.stepOne.detail, product: name(skeleton.stepOne.productId) ?? null },
    matches: skeleton.matches.map((m) => {
      const p = getProduct(m.productId);
      return {
        productId: m.productId,
        product: p?.name,
        goal: goalWord(m.goalId),
        stage: m.stage,
        unlockCondition: m.unlockCondition ?? null,
        termsToKnow: m.termsToKnow,
        rateNote: p?.rateNote,
        currentExplanation: m.explanation,
      };
    }),
    steps: skeleton.steps.map((s) => ({
      order: s.order,
      stage: s.stage,
      kind: s.kind,
      startMonth: s.startMonth,
      product: name(s.productId) ?? null,
      monthlyAmount: s.monthlyAmount ?? null,
      title: s.title,
      detail: s.detail,
    })),
    notYet: skeleton.notYet.map((n) => ({ reason: n.reason, revisitWhen: n.revisitWhen })),
    currentBankerSummary: skeleton.bankerSummary,
  };
}

function userPrompt(facts: ReturnType<typeof planFacts>): string {
  return [
    "Here is a finished plan from Sprout's engine (JSON). Every number, stage, unlock condition, lever, and product is final.",
    JSON.stringify(facts, null, 2),
    "",
    "Rewrite ONLY the wording:",
    `- headline: at most ${TEXT_BUDGET.headlineWords} words, optimistic, about what this plan gets them.`,
    `- sproutSays: exactly ${TEXT_BUDGET.sproutSaysSentences} sentences, at most ${TEXT_BUDGET.sproutSaysWords} words in total. If the user's top-value goal has a turn_up_dial lever, lead with it ("Japan is $140 a month away"). Say "a month away" ONLY for a goal whose onTrack is false, with its gapMonthly or its turn_up_dial amount; an on-track goal is "on track", never "away". Mention when the safety cushion fills if cushionFillsInTime is set, in those words. Call it the "safety cushion".`,
    "- stepOne is FINAL: do not write a title or detail for it. Step 1 in steps is the same action; leave it as given.",
    `- explanations: one per productId above, 1 to 2 sentences on why it fits THIS user, tied to that goal's motivation or why. The first sentence is at most ${TEXT_BUDGET.explanationFirstSentenceWords} words (it is shown on its own). Account cards must keep the fee line from termsToKnow (the fee and how this user avoids it). For the top-value goal's match, mention its lever in plain words. For later items, say what unlocks it.`,
    "- steps: one per order number above except order 1; short imperative title and a 1-sentence detail. Keep the same action, product, and amount.",
    "- bankerSummary: plain factual text a banker reads before the call; use only the numbers and products given.",
    "Use only numbers that appear in the JSON. Never invent rates, fees, or products. Unpublished rates: say to check the current rate with FNB.",
  ].join("\n");
}

async function aiPlanText(facts: ReturnType<typeof planFacts>): Promise<AiPlanText> {
  const client = getClient();
  if (!client) throw new Error("ANTHROPIC_API_KEY not set");
  const model = getModel();
  const response = await client.messages.parse(
    {
      model,
      max_tokens: 8000,
      // Wording-only rewrite of finished numbers: thinking off keeps the hero plan inside the 20s
      // budget. `between_tools` is the Sonnet 5.5 way to turn thinking off; other models keep defaults.
      ...(model === "claude-sonnet-5-5" ? { thinking: { type: "between_tools" as const } } : {}),
      output_config: { effort: "low", format: zodOutputFormat(AiPlanTextSchema) },
      system: PLAN_SYSTEM,
      messages: [{ role: "user", content: userPrompt(facts) }],
    },
    { timeout: PLAN_TIMEOUT_MS, maxRetries: 0, signal: AbortSignal.timeout(PLAN_TIMEOUT_MS) },
  );
  if (response.stop_reason !== "end_turn") throw new Error(`stop_reason=${response.stop_reason}`);
  if (!response.parsed_output) throw new Error("no parsed output");
  return response.parsed_output;
}

// Every number the engine produced (plus rounded forms), so AI text can cite them but not invent new ones.
function allowedNumbers(facts: unknown): Set<string> {
  const allowed = new Set<string>(["0", "1", "2", "3"]);
  for (const raw of JSON.stringify(facts).match(/\d[\d,]*(?:\.\d+)?/g) ?? []) {
    const n = Number(raw.replace(/,/g, ""));
    if (!Number.isFinite(n)) continue;
    allowed.add(String(n));
    allowed.add(String(Math.round(n)));
    allowed.add(String(Math.floor(n)));
  }
  return allowed;
}

// Number guard + voice guard + text budget: an AI string survives only if every number it cites came
// from the engine, it uses no banned voice words ("just" is removed; others keep the template text),
// and it fits the field's budget when one applies.
export function makeGuard(facts: unknown, plan?: Plan) {
  const allowed = allowedNumbers(facts);
  let rejected = 0;
  let overBudget = 0;
  const pick = (ai: string | undefined, template: string, max: number, within?: (text: string) => boolean) => {
    const fallback = voiceNormalize(template);
    const text = clean(ai, max);
    if (!text) return fallback;
    const numbers = text.match(/\d[\d,]*(?:\.\d+)?/g) ?? [];
    const safe = numbers.every((t) => allowed.has(String(Number(t.replace(/,/g, ""))))) ? voiceSafe(text) : null;
    if (!safe) {
      rejected++;
      return fallback;
    }
    const voiced = voiceNormalize(safetyCushionName(safe));
    // A "$N a month away" that isn't a real off-track gap contradicts the engine: keep the template.
    if (plan && !gapClaimsConsistent(voiced, plan)) {
      rejected++;
      return fallback;
    }
    if (within && !within(voiced)) {
      overBudget++;
      return fallback;
    }
    return voiced;
  };
  return { pick, rejected: () => rejected, overBudget: () => overBudget };
}

// Copies AI text onto the skeleton by key; anything omitted or failing a guard keeps the template.
// Step one (and step 1, the same action) is never touched: SPROUT.md v3 rule D.
export function mergeText(skeleton: Plan, ai: AiPlanText, guard: ReturnType<typeof makeGuard>): Plan {
  const { pick } = guard;
  const explanationFor = new Map(ai.explanations.map((e) => [e.productId, e.explanation]));
  const stepFor = new Map(ai.steps.map((s) => [s.order, s]));
  return {
    ...skeleton,
    headline: pick(ai.headline, skeleton.headline, 120, withinHeadlineBudget),
    sproutSays: pick(ai.sproutSays, skeleton.sproutSays, 400, withinSproutSaysBudget),
    stepOne: { ...skeleton.stepOne },
    matches: skeleton.matches.map((m) => ({
      ...m,
      explanation: pick(explanationFor.get(m.productId), m.explanation, 400, withinExplanationBudget),
    })),
    steps: skeleton.steps.map((s) => {
      if (s.order === 1) return { ...s, title: skeleton.stepOne.title, detail: skeleton.stepOne.detail };
      const t = stepFor.get(s.order);
      return { ...s, title: pick(t?.title, s.title, 120), detail: pick(t?.detail, s.detail, 300) };
    }),
    bankerSummary: pick(ai.bankerSummary, skeleton.bankerSummary, 1200),
    aiUsed: true,
  };
}

// Full fallback: the engine's template wording, with the same voice normalization AI text gets
// ("safety cushion", specific times). Numbers, stages, and products are untouched; Step one stays exact.
function normalizedTemplates(plan: Plan): Plan {
  return {
    ...plan,
    headline: voiceNormalize(plan.headline),
    sproutSays: voiceNormalize(plan.sproutSays),
    matches: plan.matches.map((m) => ({ ...m, explanation: voiceNormalize(m.explanation) })),
    steps: plan.steps.map((s) => (s.order === 1 ? s : { ...s, title: voiceNormalize(s.title), detail: voiceNormalize(s.detail) })),
    notYet: plan.notYet.map((n) => ({ ...n, reason: voiceNormalize(n.reason), revisitWhen: voiceNormalize(n.revisitWhen) })),
    bankerSummary: voiceNormalize(plan.bankerSummary),
  };
}

// Audit hook (scripts/ai-audit.ts): the AI's raw wording and the facts it saw, before any guard runs.
export interface PlanAudit {
  onRaw?: (ai: AiPlanText, facts: unknown) => void;
}

export async function generatePlan(skeleton: Plan, profile: GoalProfile, audit: PlanAudit = {}): Promise<PlanResult> {
  const safeSkeleton = dropUnknownProducts(skeleton);
  try {
    const facts = planFacts(safeSkeleton, profile);
    const ai = await aiPlanText(facts);
    audit.onRaw?.(ai, facts);
    const guard = makeGuard(facts, safeSkeleton);
    const plan = PlanSchema.parse(dropUnknownProducts(mergeText(safeSkeleton, ai, guard)));
    if (guard.rejected() > 0) console.log(`[ai/plan] number/voice guard kept template text for ${guard.rejected()} field(s)`);
    if (guard.overBudget() > 0) console.log(`[ai/plan] text budget kept template text for ${guard.overBudget()} field(s)`);
    return { plan, aiUsed: true, rejectedFields: guard.rejected() + guard.overBudget() };
  } catch (error) {
    return { plan: { ...normalizedTemplates(safeSkeleton), aiUsed: false }, aiUsed: false, fallbackReason: describeAiError(error) };
  }
}
