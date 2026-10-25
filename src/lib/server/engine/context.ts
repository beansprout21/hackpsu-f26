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

export function buildContext(profile: GoalProfile, snapshot: FinancialSnapshot, intake: IntakeAnswers): EngineContext {
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
