// Fixed persona taxonomy (docs/CONTRACTS.md); taglines fixed by docs/SPROUT.md v2. Single source of truth for the pre-login reveal
// and /api/profile: the persona comes from the top swipe value; AI only personalizes the description.
import type { PersonaDef, ValueTag } from "@/types";

export const PERSONA_BY_VALUE: Record<ValueTag, PersonaDef> = {
  freedom: {
    id: "freedom_seeker",
    label: "Freedom Seeker",
    tagline: "You want options, and money is how you buy them.",
  },
  experiences: {
    id: "experience_collector",
    label: "Experience Collector",
    tagline: "You'd rather have stories than stuff, so let's fund the stories.",
  },
  security: {
    id: "safety_builder",
    label: "Safety Builder",
    tagline: "You sleep better with a cushion, so we build that first.",
  },
  family: {
    id: "family_first",
    label: "Family First",
    tagline: "Your money plans start with the people you love.",
  },
  growth: {
    id: "future_builder",
    label: "Future Builder",
    tagline: "You're playing the long game, and it shows.",
  },
  simplicity: {
    id: "simple_saver",
    label: "Simple Saver",
    tagline: "You want money to be easy, so we keep it simple and automatic.",
  },
};

// Top value wins; no values yet -> Simple Saver.
export function personaFromValues(values: ValueTag[]): PersonaDef {
  const top = values[0];
  return top ? PERSONA_BY_VALUE[top] : PERSONA_BY_VALUE.simplicity;
}
