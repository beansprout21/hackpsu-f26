"use client";

// Sprout narrates the ~17s profile + plan wait. Stage follows the real API calls; the detail
// line rotates within a stage, and the bar eases toward (never reaches) 100% until the plan lands.
import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { SproutSays } from "@/components/sprout/SproutSays";

export type GenerationStage = "profile" | "plan";

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
  const value = Math.round(s.from + (s.to - s.from) * (1 - Math.exp(-ms / s.expectMs)));
  const detail = s.details[Math.floor(ms / DETAIL_EVERY_MS) % s.details.length];

  return (
    <div className="flex flex-col gap-6" role="status" aria-live="polite">
      <SproutSays mood="thinking">
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
