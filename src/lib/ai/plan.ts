// Engine Plan -> Plan with AI-written text. The AI rewrites words only (headline, sproutSays,
// Step one and step wording, match explanations, banker summary). Amounts, buckets, stages,
// triggers, product ids, and the Step one choice stay exactly as the engine produced them.
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { GoalProfile, Plan } from "@/types";
import { PlanSchema } from "@/types/schemas";
import { getProduct, isCatalogId } from "@/lib/server/catalog";
import { GOAL_LABELS } from "@/lib/server/engine/defaults";
import { describeAiError, getClient, getModel, requestOptions, SPROUT_SYSTEM } from "./client";

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
}

const clean = (s: string | undefined, max: number) => (s ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const pick = (ai: string | undefined, fallback: string, max: number) => clean(ai, max) || fallback;

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
    richLifeStatement: profile.richLifeStatement,
    goals: profile.goals.map((g) => ({
      id: g.id,
      label: GOAL_LABELS[g.id],
      priority: g.priority,
      why: g.why,
      motivation: g.motivation,
      targetAmount: g.targetAmount,
      horizonMonths: g.horizonMonths,
    })),
    money: {
      effectiveMonthlyIncome: skeleton.effectiveMonthlyIncome,
      monthlySurplus: skeleton.monthlySurplus,
      threeMonthCushion: skeleton.emergencyFundTarget,
      spendingPlan: skeleton.spendingPlan.map((b) => ({ bucket: b.bucket, monthlyAmount: b.monthlyAmount })),
      allocation: skeleton.allocation,
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
        keyTerms: p?.keyTerms.slice(0, 3) ?? [],
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

function userPrompt(skeleton: Plan, profile: GoalProfile): string {
  return [
    "Here is a finished plan from Sprout's deterministic engine (JSON). The numbers, stages, unlock conditions, and products are final.",
    JSON.stringify(planFacts(skeleton, profile), null, 2),
    "",
    "Rewrite ONLY the wording, in Sprout's voice:",
    "- headline: at most 12 words, optimistic, about what this plan gets them.",
    "- sproutSays: exactly 2 sentences introducing the plan. Lead with what they can do now.",
    "- stepOne: title and detail for the same action. Do not change which action it is.",
    "- explanations: one per productId above, 1 to 2 sentences on why it fits THIS user. Each must reference that goal's motivation or why in plain words. For later items, say what unlocks it.",
    "- steps: one per order number above; short imperative title and a 1-sentence detail. Keep the same action, product, and amount.",
    "- bankerSummary: plain factual text a banker reads before the call; use only the numbers and products given.",
    "Use only numbers and facts from the JSON. Never invent rates, fees, or products. Unpublished rates: say to check the current rate with FNB.",
  ].join("\n");
}

async function aiPlanText(skeleton: Plan, profile: GoalProfile): Promise<AiPlanText> {
  const client = getClient();
  if (!client) throw new Error("ANTHROPIC_API_KEY not set");
  const response = await client.messages.parse(
    {
      model: getModel(),
      max_tokens: 8000,
      output_config: { effort: "low", format: zodOutputFormat(AiPlanTextSchema) },
      system: SPROUT_SYSTEM,
      messages: [{ role: "user", content: userPrompt(skeleton, profile) }],
    },
    requestOptions(),
  );
  if (response.stop_reason !== "end_turn") throw new Error(`stop_reason=${response.stop_reason}`);
  if (!response.parsed_output) throw new Error("no parsed output");
  return response.parsed_output;
}

// Copies AI text onto the skeleton by key; anything the AI omits keeps the template text.
function mergeText(skeleton: Plan, ai: AiPlanText): Plan {
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
    const ai = await aiPlanText(safeSkeleton, profile);
    const plan = PlanSchema.parse(dropUnknownProducts(mergeText(safeSkeleton, ai)));
    return { plan, aiUsed: true };
  } catch (error) {
    return { plan: { ...safeSkeleton, aiUsed: false }, aiUsed: false, fallbackReason: describeAiError(error) };
  }
}
