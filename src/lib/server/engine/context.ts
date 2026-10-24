// Everything the engine rules read, computed once from the request.
import type { FinancialSnapshot, GoalProfile, IntakeAnswers, ValueTag } from "@/types";
import { computeMath, type MoneyMath } from "./math";

export interface EngineContext {
  profile: GoalProfile;
  snapshot: FinancialSnapshot;
  intake: IntakeAnswers;
  math: MoneyMath;
  values: ValueTag[];
  isStudent: boolean;
  // Rule set B: students (or no steady income) target the starter cushion first; steady income targets full.
  cushionTarget: number;
  // Rule set B: students / no steady income save 20% of income; steady income saves 10% + Future You.
  studentRules: boolean;
}

export function buildContext(profile: GoalProfile, snapshot: FinancialSnapshot, intake: IntakeAnswers): EngineContext {
  const math = computeMath(snapshot);
  const values: ValueTag[] = profile.topValues.length ? profile.topValues : intake.values;
  const isStudent = intake.lifeStage === "student";
  const studentRules = isStudent || !snapshot.hasSteadyIncome;
  return {
    profile,
    snapshot,
    intake,
    math,
    values,
    isStudent,
    studentRules,
    cushionTarget: studentRules ? math.starterCushion : math.fullCushion,
  };
}

export const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
