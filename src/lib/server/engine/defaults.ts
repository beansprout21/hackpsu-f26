// Target estimates (USD) when the user gave no amount. Used by the /api/profile fallback;
// the engine itself sizes the emergency fund from the snapshot (3 x monthly costs).
import type { GoalId } from "@/types";

export const GOAL_TARGET_DEFAULTS: Record<GoalId, number> = {
  first_home: 15000, // down payment + closing costs
  travel: 2000,
  emergency_fund: 2000,
  small_business: 2500,
  education: 2000,
  family: 3000,
  credit_building: 500, // typical starter secured-card deposit
  everyday_banking: 300,
};

export const GOAL_LABELS: Record<GoalId, string> = {
  first_home: "first home",
  travel: "travel",
  emergency_fund: "emergency fund",
  small_business: "small business",
  education: "education",
  family: "family",
  credit_building: "credit building",
  everyday_banking: "everyday banking",
};

export function estimateTarget(goalId: GoalId): number {
  return GOAL_TARGET_DEFAULTS[goalId];
}
