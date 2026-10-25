// Everything the engine rules read, computed once from the request.
import type { FinancialSnapshot, GoalId, GoalProfile, IntakeAnswers, ProfiledGoal, ValueTag } from "@/types";
import { computeMath, type MoneyMath } from "./math";

export interface EngineContext {
  profile: GoalProfile;
  snapshot: FinancialSnapshot;
  intake: IntakeAnswers;
  math: MoneyMath;
  values: ValueTag[];
  isStudent: boolean;
  // Rule set B (v3): the safety cushion, max($1,000, 3 x monthly costs), for everyone.
  cushionTarget: number;
  // Rule set B: students / no steady income save 20% of income; steady income saves 10% + Future You.
  studentRules: boolean;
  // Rule set B v3.1 values tilt: top value security or family -> 60/40 cushion split, cushion-first Step one.
  cushionFirst: boolean;
  // Rule set B v3.2: money goals (get savings, priority order) vs habits (cost time, not money).
  moneyGoals: ProfiledGoal[];
  habits: ProfiledGoal[];
}

// SPROUT.md v3.2: these goals are habits. No allocation; they become steps.
export const HABIT_GOALS: GoalId[] = ["everyday_banking", "credit_building"];
export const isHabit = (id: GoalId) => HABIT_GOALS.includes(id);

const CUSHION_FIRST_VALUES: ValueTag[] = ["security", "family"];

// SPROUT.md v3.3 (#105): duplicate goal ids keep the first occurrence (highest priority); the rest are dropped and
// priorities renumbered 1..n (capped at 3, the contract's range). Inputs without duplicates pass through unchanged.
export function uniqueGoals<G extends { id: GoalId; priority: 1 | 2 | 3 }>(goals: G[]): G[] {
  const seen = new Set<GoalId>();
  const kept = [...goals].sort((a, b) => a.priority - b.priority).filter((g) => !seen.has(g.id) && !!seen.add(g.id));
  if (kept.length === goals.length) return goals;
  return kept.map((g, i) => ({ ...g, priority: Math.min(i + 1, 3) as 1 | 2 | 3 }));
}

export function buildContext(profileIn: GoalProfile, snapshot: FinancialSnapshot, intakeIn: IntakeAnswers): EngineContext {
  const profile = { ...profileIn, goals: uniqueGoals(profileIn.goals) };
  const intake = { ...intakeIn, goals: uniqueGoals(intakeIn.goals) };
  const math = computeMath(snapshot);
  const values: ValueTag[] = profile.topValues.length ? profile.topValues : intake.values;
  const isStudent = intake.lifeStage === "student";
  const studentRules = isStudent || !snapshot.hasSteadyIncome;
  const byPriority = [...profile.goals].sort((a, b) => a.priority - b.priority);
  return {
    profile,
    snapshot,
    intake,
    math,
    values,
    isStudent,
    studentRules,
    cushionTarget: math.safetyCushion,
    cushionFirst: !!values[0] && CUSHION_FIRST_VALUES.includes(values[0]),
    moneyGoals: byPriority.filter((g) => !isHabit(g.id)),
    habits: byPriority.filter((g) => isHabit(g.id)),
  };
}

export const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
