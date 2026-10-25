import { SWIPE_CARDS } from "@/data/swipeCards";
import { IntakeAnswersSchema } from "@/types/schemas";
import type { GoalId, IntakeAnswers, LifeStage, SwipeAnswer, ValueTag } from "@/types";
import { goalMeta } from "./copy";

export interface GoalDraft {
  id: GoalId;
  horizonMonths: number;
  targetAmount?: number;
  whyChip?: string;
  whyText: string;
}

export interface IntakeDraft {
  lifeStage?: LifeStage;
  swipes: SwipeAnswer[];
  goals: GoalDraft[]; // money goals first, in priority order; habits after (unranked)
  richLifeText: string;
}

export const isHabit = (id: GoalId) => goalMeta(id).group === "habit";
export const MAX_MONEY_GOALS = 3;

// Contracts v2.4: money goals first, then habits, keeping each group's order.
export const moneyFirst = <T extends { id: GoalId }>(goals: T[]) => [
  ...goals.filter((g) => !isHabit(g.id)),
  ...goals.filter((g) => isHabit(g.id)),
];

export const EMPTY_DRAFT: IntakeDraft = { swipes: [], goals: [], richLifeText: "" };

// Values picked at least twice, most-picked first, ties broken by first pick, max 3.
// Eight picks across six values guarantees at least one repeat.
export function deriveValues(swipes: SwipeAnswer[]): ValueTag[] {
  const tally = new Map<ValueTag, { count: number; first: number }>();
  swipes.forEach((s, i) => {
    const card = SWIPE_CARDS.find((c) => c.id === s.cardId);
    if (!card) return;
    const value = card[s.choice].value;
    const entry = tally.get(value);
    if (entry) entry.count += 1;
    else tally.set(value, { count: 1, first: i });
  });
  const ranked = [...tally.entries()]
    .sort(([, a], [, b]) => b.count - a.count || a.first - b.first)
    .map(([value]) => value);
  const repeated = ranked.filter((v) => tally.get(v)!.count >= 2).slice(0, 3);
  return repeated.length > 0 ? repeated : ranked.slice(0, 1);
}

export function draftFromIntake(intake: IntakeAnswers): IntakeDraft {
  return {
    lifeStage: intake.lifeStage,
    swipes: intake.swipes,
    goals: moneyFirst([...intake.goals].sort((a, b) => a.priority - b.priority)).map((g) => ({
      id: g.id,
      horizonMonths: g.horizonMonths,
      targetAmount: g.targetAmount,
      whyText: g.why,
    })),
    richLifeText: intake.richLifeText ?? "",
  };
}

export function intakeFromDraft(draft: IntakeDraft) {
  const candidate = {
    lifeStage: draft.lifeStage,
    swipes: draft.swipes,
    values: deriveValues(draft.swipes),
    // Priorities 1..3 rank money goals; habits sort after them (capped at 3, the contract's lowest), so a
    // habit is never the engine's P1.
    goals: moneyFirst(draft.goals).map((g, i) => ({
      id: g.id,
      priority: Math.min(i + 1, 3),
      horizonMonths: g.horizonMonths,
      ...(g.targetAmount !== undefined && { targetAmount: g.targetAmount }),
      why: g.whyText.trim() || g.whyChip || "",
    })),
    ...(draft.richLifeText.trim() && { richLifeText: draft.richLifeText.trim() }),
  };
  return IntakeAnswersSchema.safeParse(candidate);
}
