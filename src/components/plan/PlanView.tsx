"use client";

import { useEffect, useMemo } from "react";
import type { GoalProfile, Plan } from "@/types";
import { GoalsProgress } from "./GoalsProgress";
import { Roadmap } from "./Roadmap";
import { scrubAll } from "./scrub";
import { BankerCta, NotYetCard, PlanHero } from "./sections";
import { SpendingPlan } from "./SpendingPlan";

// Hierarchy: rich life + headline, the monthly number, goals, roadmap (Step one first), not yet, banker.
export function PlanView({ plan: rawPlan, profile: rawProfile }: { plan: Plan; profile: GoalProfile }) {
  const plan = useMemo(() => scrubAll(rawPlan), [rawPlan]);
  const profile = useMemo(() => scrubAll(rawProfile), [rawProfile]);

  useEffect(() => {
    if (!plan.aiUsed) console.info("[plan] Rendering engine fallback text (aiUsed=false).");
  }, [plan.aiUsed]);

  return (
    <div className="flex flex-col gap-12">
      <PlanHero plan={plan} profile={profile} />
      <SpendingPlan plan={plan} />
      <GoalsProgress allocation={plan.allocation} />
      <Roadmap plan={plan} />
      <NotYetCard items={plan.notYet} />
      <BankerCta summary={plan.bankerSummary} />
      <p className="text-caption text-muted-foreground">{plan.disclaimer}</p>
    </div>
  );
}
