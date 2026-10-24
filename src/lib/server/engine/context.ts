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
  // Cushion that gates new money commitments (deposit-blocked products, unlock thresholds).
  // Students aim for the starter cushion first; security/family-first users and families aim for full.
  cushionTarget: number;
}

const CAUTIOUS_VALUES: ValueTag[] = ["security", "family"];

export function buildContext(profile: GoalProfile, snapshot: FinancialSnapshot, intake: IntakeAnswers): EngineContext {
  const math = computeMath(snapshot);
  const values = profile.topValues.length ? profile.topValues : intake.values;
  const isStudent = intake.lifeStage === "student";
  const cautious = values[0] !== undefined && CAUTIOUS_VALUES.includes(values[0]);
  return {
    profile,
    snapshot,
    intake,
    math,
    values,
    isStudent,
    cushionTarget: isStudent && !cautious ? math.starterCushion : math.fullCushion,
  };
}

export const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
