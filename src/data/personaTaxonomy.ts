// Fixed persona taxonomy (docs/CONTRACTS.md). Single source of truth for the pre-login reveal
// and /api/profile: the persona comes from the top swipe value; AI only personalizes the description.
import type { PersonaDef, ValueTag } from "@/types";

export const PERSONA_BY_VALUE: Record<ValueTag, PersonaDef> = {
  freedom: {
    id: "freedom_seeker",
    label: "Freedom Seeker",
    tagline: "You want money to open doors, so you can say yes when life gets interesting.",
  },
  experiences: {
    id: "experience_collector",
    label: "Experience Collector",
    tagline: "You'd rather collect memories than things, and your money should help you chase them.",
  },
  security: {
    id: "safety_builder",
    label: "Safety Builder",
    tagline: "You sleep better with a cushion, and every dollar you save makes tomorrow feel steadier.",
  },
  family: {
    id: "family_first",
    label: "Family First",
    tagline: "The people you love come first, and your plan is built to look after them.",
  },
  growth: {
    id: "future_builder",
    label: "Future Builder",
    tagline: "You're playing the long game, turning small steps today into big wins later.",
  },
  simplicity: {
    id: "simple_saver",
    label: "Simple Saver",
    tagline: "You like money that runs itself: clear, automatic, and stress-free.",
  },
};

// Top value wins; no values yet -> Simple Saver.
export function personaFromValues(values: ValueTag[]): PersonaDef {
  const top = values[0];
  return top ? PERSONA_BY_VALUE[top] : PERSONA_BY_VALUE.simplicity;
}
