"use client";

// Sprout narrates the ~17s profile + plan wait. Stage follows the real API calls; the detail
// line rotates within a stage, and the bar eases toward (never reaches) 100% until the plan lands.
import { useEffect, useState } from "react";
import { GrowingSprout } from "@/components/brand/GrowingSprout";
import { Progress } from "@/components/ui/progress";
import { SproutSays } from "@/components/sprout/SproutSays";

// "done" (plan received) shows the finished tree; the flow can set it just before opening the plan.
export type GenerationStage = "profile" | "plan" | "done";

const STAGES: Record<GenerationStage, { title: string; details: string[]; from: number; to: number; expectMs: number }> = {
  profile: {
    title: "Understanding your goals",
    details: ["Reading what matters to you", "Sizing up each goal", "Putting your why into words"],
    from: 4,
    to: 40,
    expectMs: 6000,
  },
  plan: {
    title: "Matching FNB products to your goals",
    details: ["Building your spending plan", "Checking what unlocks later", "Lining up your step one", "Putting it in plain words"],
    from: 40,
    to: 95,
    expectMs: 11000,
  },
  done: {
    title: "Your plan is ready",
    details: ["Opening your plan"],
    from: 100,
    to: 100,
    expectMs: 1,
  },
};

// How far the money tree has grown at each stage: the profile call sprouts the seed, the plan call grows
// the tree and its coin leaves, and only a finished plan shows the full tree.
const GROWTH: Record<GenerationStage, { from: number; to: number }> = {
  profile: { from: 0.05, to: 0.35 },
  plan: { from: 0.35, to: 0.95 },
  done: { from: 1, to: 1 },
};

const DETAIL_EVERY_MS = 3000;
const TICK_MS = 250;

export function GenerationProgress({ stage }: { stage: GenerationStage }) {
  const [elapsed, setElapsed] = useState({ stage, ms: 0 });
  const ms = elapsed.stage === stage ? elapsed.ms : 0;

  useEffect(() => {
    const started = Date.now();
    const id = setInterval(() => setElapsed({ stage, ms: Date.now() - started }), TICK_MS);
    return () => clearInterval(id);
  }, [stage]);

  const s = STAGES[stage];
  // Ease toward the stage's end value: fast at first, slowing as it approaches.
  const eased = 1 - Math.exp(-ms / s.expectMs);
  const value = Math.round(s.from + (s.to - s.from) * eased);
  const growth = GROWTH[stage].from + (GROWTH[stage].to - GROWTH[stage].from) * eased;
  const detail = s.details[Math.floor(ms / DETAIL_EVERY_MS) % s.details.length];

  return (
    <div className="flex flex-col gap-6" role="status" aria-live="polite">
      <GrowingSprout growth={growth} className="mx-auto size-40 lg:size-48" />
      <SproutSays mood={stage === "done" ? "happy" : "thinking"}>
        <p className="font-semibold">{s.title}</p>
        <p className="text-muted-foreground">{detail}...</p>
      </SproutSays>
      <Progress value={value} aria-label="Building your plan" />
      <ol className="flex flex-col gap-1 text-sm text-muted-foreground">
        <li className={stage === "profile" ? "font-medium text-foreground" : ""}>1. {STAGES.profile.title}</li>
        <li className={stage === "plan" ? "font-medium text-foreground" : ""}>2. {STAGES.plan.title}</li>
      </ol>
    </div>
  );
}
