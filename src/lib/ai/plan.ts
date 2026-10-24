// Engine Plan -> Plan with AI-written text (docs/SPROUT.md v2, Plan prompt contract). The AI
// rewrites words only (headline, sproutSays, Step one and step wording, match explanations,
// banker summary). Amounts, buckets, stages, triggers, levers, product ids, and the Step one
// choice stay exactly as the engine produced them, and any AI text that cites a number the
// engine didn't produce falls back to the template text.
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { GoalProfile, Plan } from "@/types";
import { PlanSchema } from "@/types/schemas";
import { getProduct, isCatalogId } from "@/lib/server/catalog";
import { GOAL_LABELS } from "@/lib/server/engine/defaults";
import { describeAiError, getClient, getModel } from "./client";

const PLAN_TIMEOUT_MS = 20_000;

// docs/SPROUT.md "Sprout's voice", shared with /api/profile.
export const VOICE_RULES = [
  "Voice rules:",
  '1. Possibility first ("Japan is $140 a month away", never "You can\'t afford Japan").',
  '2. A number and a date ("$113 a month fills your cushion in 3 months").',
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
  "You receive a finished plan from Sprout's engine. You only write words. Never change any number, stage, lever, product, or the Step one choice.",
  "Stay within budgeting, saving, credit building, and FNB products; for investing or taxes say an FNB advisor can help. Output JSON only.",
  "",
  VOICE_RULES,
].join("\n");

const AiPlanTextSchema = z.object({
  headline: z.string(),
  sproutSays: z.string(),
  stepOne: z.object({ title: z.string(), detail: z.string() }),
  explanations: z.array(z.object({ productId: z.string(), explanation: z.string() })),
  steps: z.array(z.object({ order: z.number(), title: z.string(), detail: z.string() })),
  bankerSummary: z.string(),
});
type AiPlanText = z.infer<typeof AiPlanTextSchema>;

export interface PlanResult {
  plan: Plan;
  aiUsed: boolean;
  fallbackReason?: string;
  rejectedFields?: number;
}

const clean = (s: string | undefined, max: number) => (s ?? "").replace(/\s+/g, " ").trim().slice(0, max);

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
        label: GOAL_LABELS[g.id],
        priority: g.priority,
        why: g.why,
        motivation: g.motivation,
        targetAmount: g.targetAmount,
        horizonMonths: g.horizonMonths,
        monthlyAmount: a?.monthlyAmount ?? 0,
        requiredMonthly: a?.requiredMonthly ?? null,
        onTrack: a?.onTrack ?? null,
        levers: a?.levers ?? [],
      };
    }),
    money: {
      effectiveMonthlyIncome: skeleton.effectiveMonthlyIncome,
      monthlySurplus: skeleton.monthlySurplus,
      fixedSharePercent: Math.round(skeleton.fixedShare * 100),
      cushionTarget: skeleton.cushionTarget,
      cushionFillsInMonths: skeleton.cushionFillsInMonths,
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
        goal: GOAL_LABELS[m.goalId],
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
    "- headline: at most 12 words, optimistic, about what this plan gets them.",
    "- sproutSays: exactly 2 sentences. If the user's top-value goal has a turn_up_dial lever, lead with it (\"Japan is $140 a month away\"). Mention when the cushion fills if cushionFillsInMonths is set.",
    "- stepOne: title and detail for the same action. Do not change which action it is.",
    "- explanations: one per productId above, 1 to 2 sentences on why it fits THIS user, tied to that goal's motivation or why. Account cards must keep the fee line from termsToKnow (the fee and how this user avoids it). For the top-value goal's match, mention its lever in plain words. For later items, say what unlocks it.",
    "- steps: one per order number above; short imperative title and a 1-sentence detail. Keep the same action, product, and amount.",
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

function makeGuard(facts: unknown) {
  const allowed = allowedNumbers(facts);
  let rejected = 0;
  const pick = (ai: string | undefined, fallback: string, max: number) => {
    const text = clean(ai, max);
    if (!text) return fallback;
    const numbers = text.match(/\d[\d,]*(?:\.\d+)?/g) ?? [];
    if (numbers.every((t) => allowed.has(String(Number(t.replace(/,/g, "")))))) return text;
    rejected++;
    return fallback;
  };
  return { pick, rejected: () => rejected };
}

// Copies AI text onto the skeleton by key; anything omitted or failing the number guard keeps the template.
function mergeText(skeleton: Plan, ai: AiPlanText, guard: ReturnType<typeof makeGuard>): Plan {
  const { pick } = guard;
  const explanationFor = new Map(ai.explanations.map((e) => [e.productId, e.explanation]));
  const stepFor = new Map(ai.steps.map((s) => [s.order, s]));
  const stepOne = {
    ...skeleton.stepOne,
    title: pick(ai.stepOne.title, skeleton.stepOne.title, 120),
    detail: pick(ai.stepOne.detail, skeleton.stepOne.detail, 300),
  };
  return {
    ...skeleton,
    headline: pick(ai.headline, skeleton.headline, 120),
    sproutSays: pick(ai.sproutSays, skeleton.sproutSays, 400),
    stepOne,
    matches: skeleton.matches.map((m) => ({ ...m, explanation: pick(explanationFor.get(m.productId), m.explanation, 400) })),
    steps: skeleton.steps.map((s) => {
      // Step 1 is the Step one action: keep the two in sync.
      if (s.order === 1 && s.kind === skeleton.stepOne.kind && s.productId === skeleton.stepOne.productId) {
        return { ...s, title: stepOne.title, detail: stepOne.detail };
      }
      const t = stepFor.get(s.order);
      return { ...s, title: pick(t?.title, s.title, 120), detail: pick(t?.detail, s.detail, 300) };
    }),
    bankerSummary: pick(ai.bankerSummary, skeleton.bankerSummary, 1200),
    aiUsed: true,
  };
}

export async function generatePlan(skeleton: Plan, profile: GoalProfile): Promise<PlanResult> {
  const safeSkeleton = dropUnknownProducts(skeleton);
  try {
    const facts = planFacts(safeSkeleton, profile);
    const ai = await aiPlanText(facts);
    const guard = makeGuard(facts);
    const plan = PlanSchema.parse(dropUnknownProducts(mergeText(safeSkeleton, ai, guard)));
    if (guard.rejected() > 0) console.log(`[ai/plan] number guard kept template text for ${guard.rejected()} field(s)`);
    return { plan, aiUsed: true, rejectedFields: guard.rejected() };
  } catch (error) {
    return { plan: { ...safeSkeleton, aiUsed: false }, aiUsed: false, fallbackReason: describeAiError(error) };
  }
}
