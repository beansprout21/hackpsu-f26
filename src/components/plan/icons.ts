import {
  BookOpen,
  Calculator,
  DoorOpen,
  Hourglass,
  MessageCircle,
  PiggyBank,
  Repeat,
  type LucideIcon,
} from "lucide-react";
import type { StepKind } from "@/types";

export const STEP_ICONS: Record<StepKind, LucideIcon> = {
  save: PiggyBank,
  open: DoorOpen,
  learn: BookOpen,
  habit: Repeat,
  budget: Calculator,
  talk_to_banker: MessageCircle,
  wait: Hourglass,
};
