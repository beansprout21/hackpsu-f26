// Intake -> GoalProfile. The AI writes words only (persona description, rich life statement,
// motivations, estimates, notes); persona id/label, goals, priorities, and horizons come from
// the intake and the taxonomy, so the AI can't rename a persona or add a goal.
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { GoalAnswer, GoalId, GoalProfile, IntakeAnswers, ProfiledGoal } from "@/types";
import { GoalIdSchema, GoalProfileSchema } from "@/types/schemas";
import { personaFromValues } from "@/data/personaTaxonomy";
import { estimateTarget, GOAL_LABELS } from "@/lib/server/engine/defaults";
import { describeAiError, getClient, getModel, requestOptions, SPROUT_SYSTEM } from "./client";

const RICH_LIFE_PHRASES: Record<GoalId, string> = {
  first_home: "a home of my own",
  travel: "seeing the world",
  emergency_fund: "a cushion for surprises",
  small_business: "building my own business",
  education: "investing in my education",
  family: "taking care of my family",
  credit_building: "strong credit",
  everyday_banking: "money that runs smoothly",
};

const AiProfileSchema = z.object({
  personaDescription: z.string(),
  richLifeStatement: z.string(),
  goals: z.array(
    z.object({
      id: GoalIdSchema,
      motivation: z.string(),
      estimatedTargetAmount: z.number().nullable(),
    }),
  ),
  notes: z.array(z.string()),
});
type AiProfile = z.infer<typeof AiProfileSchema>;

export interface ProfileResult {
  profile: GoalProfile;
  aiUsed: boolean;
  fallbackReason?: string;
}

const byPriority = (goals: GoalAnswer[]) => [...goals].sort((a, b) => a.priority - b.priority);
const clean = (s: string | undefined, max: number) => (s ?? "").replace(/\s+/g, " ").trim().slice(0, max);

function joinList(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")}${items.length > 2 ? "," : ""} and ${items[items.length - 1]}`;
}

function fallbackMotivation(goal: GoalAnswer): string {
  const label = GOAL_LABELS[goal.id];
  return goal.why.trim()
    ? `Your ${label} goal: ${goal.why.trim()}.`
    : `${/^[aeiou]/.test(label) ? "An" : "A"} ${label} goal you want to reach within ${goal.horizonMonths} months.`;
}

// Sane range for AI estimates; anything else falls back to the engine defaults.
function acceptEstimate(amount: number | null | undefined): number | null {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) return null;
  if (amount < 50 || amount > 200_000) return null;
  return Math.round(amount / 50) * 50;
}

function buildGoals(intake: IntakeAnswers, ai?: AiProfile): ProfiledGoal[] {
  return byPriority(intake.goals).map((g) => {
    const aiGoal = ai?.goals.find((x) => x.id === g.id);
    const userTarget = g.targetAmount;
    return {
      ...g,
      targetAmount: userTarget ?? acceptEstimate(aiGoal?.estimatedTargetAmount) ?? estimateTarget(g.id),
      targetIsEstimate: userTarget === undefined,
      motivation: clean(aiGoal?.motivation, 240) || fallbackMotivation(g),
    };
  });
}

export function fallbackProfile(intake: IntakeAnswers): GoalProfile {
  const def = personaFromValues(intake.values);
  const own = clean(intake.richLifeText, 300);
  const phrases = byPriority(intake.goals).map((g) => RICH_LIFE_PHRASES[g.id]);
  return GoalProfileSchema.parse({
    persona: { id: def.id, label: def.label, description: def.tagline },
    richLifeStatement: own || `My rich life means ${joinList(phrases)}.`,
    goals: buildGoals(intake),
    topValues: intake.values,
    notes: [],
  });
}

function userPrompt(intake: IntakeAnswers): string {
  const def = personaFromValues(intake.values);
  const facts = {
    lifeStage: intake.lifeStage,
    values: intake.values,
    persona: def.label,
    goals: byPriority(intake.goals).map((g) => ({
      id: g.id,
      priority: g.priority,
      horizonMonths: g.horizonMonths,
      targetAmount: g.targetAmount ?? null,
      why: g.why,
    })),
    richLifeText: intake.richLifeText ?? null,
  };
  return [
    "Build a goal profile from these intake answers (JSON):",
    JSON.stringify(facts, null, 2),
    "",
    "Write:",
    `- personaDescription: 1 warm sentence in Sprout's voice, to the user as "you", about why "${def.label}" fits their values and goals. Do not rename the persona.`,
    '- richLifeStatement: 1 to 2 sentences in the USER\'s own voice ("My rich life is..."), using their words where they gave any.',
    "- goals: one entry per goal id above. motivation = 1 plain sentence on why this goal matters to them. estimatedTargetAmount = a realistic USD estimate ONLY when targetAmount is null, otherwise null.",
    "- notes: up to 3 short tensions or constraints you notice between the goals (timelines, priorities). Use only the intake; you don't know their finances.",
    "Never mention specific products, banks, rates, or fees.",
  ].join("\n");
}

async function aiProfile(intake: IntakeAnswers): Promise<AiProfile> {
  const client = getClient();
  if (!client) throw new Error("ANTHROPIC_API_KEY not set");
  const response = await client.messages.parse(
    {
      model: getModel(),
      max_tokens: 4000,
      output_config: { effort: "low", format: zodOutputFormat(AiProfileSchema) },
      system: SPROUT_SYSTEM,
      messages: [{ role: "user", content: userPrompt(intake) }],
    },
    requestOptions(),
  );
  if (response.stop_reason !== "end_turn") throw new Error(`stop_reason=${response.stop_reason}`);
  if (!response.parsed_output) throw new Error("no parsed output");
  return response.parsed_output;
}

export async function generateProfile(intake: IntakeAnswers): Promise<ProfileResult> {
  try {
    const ai = await aiProfile(intake);
    const def = personaFromValues(intake.values);
    const notes = ai.notes.map((n) => clean(n, 200)).filter(Boolean).slice(0, 3);
    const profile = GoalProfileSchema.parse({
      persona: { id: def.id, label: def.label, description: clean(ai.personaDescription, 240) || def.tagline },
      richLifeStatement: clean(ai.richLifeStatement, 400) || fallbackProfile(intake).richLifeStatement,
      goals: buildGoals(intake, ai),
      topValues: intake.values,
      notes,
    });
    return { profile, aiUsed: true };
  } catch (error) {
    return { profile: fallbackProfile(intake), aiUsed: false, fallbackReason: describeAiError(error) };
  }
}
