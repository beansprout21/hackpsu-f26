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

export const GOALS: { id: GoalId; label: string; icon: LucideIcon; defaultMonths: number }[] = [
  { id: "travel", label: "Travel", icon: Plane, defaultMonths: 12 },
  { id: "first_home", label: "First home", icon: House, defaultMonths: 60 },
  { id: "emergency_fund", label: "Emergency fund", icon: ShieldCheck, defaultMonths: 6 },
  { id: "credit_building", label: "Build credit", icon: CreditCard, defaultMonths: 12 },
  { id: "education", label: "Pay for school", icon: GraduationCap, defaultMonths: 24 },
  { id: "family", label: "Family", icon: Users, defaultMonths: 36 },
  { id: "small_business", label: "Start a business", icon: Store, defaultMonths: 24 },
  { id: "everyday_banking", label: "Get my everyday banking right", icon: Wallet, defaultMonths: 3 },
];

export const goalMeta = (id: GoalId) => GOALS.find((g) => g.id === id)!;

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

export function formatHorizon(months: number) {
  if (months < 24) return months === 1 ? "1 month" : `${months} months`;
  const years = Math.round((months / 12) * 2) / 2;
  return `${years} years`;
}

export function formatUsd(amount: number) {
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}
