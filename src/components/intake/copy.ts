import {
  CreditCard,
  GraduationCap,
  House,
  Plane,
  ShieldCheck,
  Store,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { GoalId, LifeStage, ValueTag } from "@/types";

export const LIFE_STAGES: { id: LifeStage; label: string; detail: string }[] = [
  { id: "student", label: "In college", detail: "Classes, aid refunds, maybe a part-time job" },
  { id: "new_grad", label: "Started working recently", detail: "First real paychecks" },
  { id: "young_family", label: "Building a family", detail: "Planning for more than one" },
];

// What the life stage screen shows: four choices that fit without scrolling, each mapped to one engine stage.
// `key` is the option's own id (several options share a LifeStage).
export const LIFE_STAGE_OPTIONS: { key: string; label: string; stage: LifeStage }[] = [
  { key: "school", label: "In school (college, grad, or trade)", stage: "student" },
  { key: "started_working", label: "Just started working", stage: "new_grad" },
  { key: "building_family", label: "Building a family", stage: "young_family" },
  { key: "something_else", label: "Something else", stage: "new_grad" },
];

export type GoalGroup = "money" | "habit";

export const GOAL_GROUPS: { id: GoalGroup; label: string }[] = [
  { id: "money", label: "Money goals" },
  { id: "habit", label: "Healthy habits" },
];

export const HABIT_HINT = "Costs time, not money: about 20 minutes to set up";

export const GOALS: {
  id: GoalId;
  label: string;
  icon: LucideIcon;
  defaultMonths: number;
  group: GoalGroup;
  hint?: string;
}[] = [
  { id: "first_home", label: "First home", icon: House, defaultMonths: 60, group: "money" },
  { id: "travel", label: "Travel", icon: Plane, defaultMonths: 12, group: "money" },
  { id: "education", label: "Pay for school", icon: GraduationCap, defaultMonths: 24, group: "money" },
  { id: "small_business", label: "Start a business", icon: Store, defaultMonths: 24, group: "money" },
  {
    id: "family",
    label: "Saving for family",
    icon: Users,
    defaultMonths: 36,
    group: "money",
    hint: "a wedding, a baby, moving in together, or helping out at home",
  },
  { id: "emergency_fund", label: "Safety cushion", icon: ShieldCheck, defaultMonths: 6, group: "money" },
  { id: "everyday_banking", label: "Get my everyday banking right", icon: Wallet, defaultMonths: 3, group: "habit", hint: HABIT_HINT },
  { id: "credit_building", label: "Build my credit", icon: CreditCard, defaultMonths: 12, group: "habit", hint: HABIT_HINT },
];

export const goalMeta = (id: GoalId) => GOALS.find((g) => g.id === id)!;

// Cost slider top end per goal (habits have no cost slider).
export const COST_MAX: Partial<Record<GoalId, number>> = {
  first_home: 60000,
  education: 40000,
  travel: 10000,
};
export const COST_MAX_DEFAULT = 15000;
export const costMax = (id: GoalId) => COST_MAX[id] ?? COST_MAX_DEFAULT;

// Shown under "Sprout's estimate" so the number isn't a black box. Amounts live in
// src/lib/server/engine/defaults.ts.
export const ESTIMATE_BASIS: Partial<Record<GoalId, string>> = {
  first_home: "About 3.5% down on a $250k starter home, plus closing costs",
  travel: "A typical study-abroad or summer trip budget",
  credit_building: "A typical secured-card deposit",
  education: "A typical year of courses or certifications",
  family: "A starter fund for a big family milestone",
  small_business: "Startup costs for a small side business",
};

// #112: the safety cushion has no amount to pick. The engine sizes it as max($1,000, 3 x monthly costs) (SPROUT.md rule B).
export const CUSHION_SIZED_NOTE = "Sprout sizes this from your costs: three months of bills and debt payments, at least $1,000.";

export const WHY_CHIPS: Record<GoalId, string[]> = {
  travel: ["Study abroad", "See family", "Bucket-list trip", "Need a break"],
  first_home: ["Stop renting", "Room for kids", "Be near family", "Build equity"],
  emergency_fund: ["Stop stressing", "Job feels shaky", "Had a scare before"],
  credit_building: ["Get an apartment", "Lower rates later", "Get approved for a car"],
  education: ["Less debt", "Grad school", "Certification"],
  small_business: ["Side hustle", "Be my own boss", "Turn a hobby into income"],
  family: ["Support my parents", "Give my kids a head start", "Plan for a new baby"],
  everyday_banking: ["Stop paying fees", "Know where my money goes", "Get paid faster"],
};

export const VALUE_LABELS: Record<ValueTag, string> = {
  freedom: "Freedom",
  security: "Security",
  experiences: "Experiences",
  family: "Family",
  growth: "Growth",
  simplicity: "Simplicity",
};

export const RICH_LIFE = {
  explainer: "Your rich life is what you'd spend on without guilt, the stuff that makes your days better.",
  prompts: [
    "What would you do with an extra $100 a month?",
    "What do you never mind spending on?",
    "What does a great year look like for you?",
  ],
};

// Starter chips for the rich life box, each tied to the values it fits.
export const RICH_LIFE_CHIPS: { text: string; values: ValueTag[] }[] = [
  { text: "Travel with friends every year", values: ["experiences", "freedom"] },
  { text: "Live without money stress", values: ["security", "simplicity"] },
  { text: "Own my place by 30", values: ["security", "growth"] },
  { text: "Help my family out", values: ["family"] },
  { text: "Learn things that grow my career", values: ["growth"] },
];

// Chips matching the user's top values come first (best-ranked value wins), the rest keep their order.
export function richLifeChips(values: ValueTag[]) {
  const rank = (chip: (typeof RICH_LIFE_CHIPS)[number]) => {
    const hits = chip.values.map((v) => values.indexOf(v)).filter((i) => i >= 0);
    return hits.length > 0 ? Math.min(...hits) : values.length;
  };
  return [...RICH_LIFE_CHIPS].sort((a, b) => rank(a) - rank(b)).map((c) => c.text);
}

export function formatHorizon(months: number) {
  if (months < 24) return months === 1 ? "1 month" : `${months} months`;
  const years = Math.round((months / 12) * 2) / 2;
  return `${years} years`;
}

export function formatUsd(amount: number) {
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}
