import { Bird, PiggyBank, Plane, ShieldCheck, TrendingUp, Users, type LucideIcon } from "lucide-react";
import type { PersonaId } from "@/types";

// One lucide icon per persona, in the same outline style as the rest of the site.
export const PERSONA_ICONS: Record<PersonaId, LucideIcon> = {
  freedom_seeker: Bird,
  experience_collector: Plane,
  safety_builder: ShieldCheck,
  family_first: Users,
  future_builder: TrendingUp,
  simple_saver: PiggyBank,
};
