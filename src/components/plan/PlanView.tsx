"use client";

import { useEffect } from "react";
import { Printer } from "lucide-react";
import type { GoalProfile, Plan } from "@/types";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { Button } from "@/components/ui/button";
import { GoalsProgress } from "./GoalsProgress";
import { PrintPlan } from "./PrintPlan";
import { Roadmap } from "./Roadmap";
import { BankerCta, NotYetCard, SproutIntro, StepOneCard } from "./sections";
import { SpendingPlan } from "./SpendingPlan";

export function PlanView({ plan, profile }: { plan: Plan; profile: GoalProfile }) {

  useEffect(() => {
    if (!plan.aiUsed) console.info("[plan] Rendering engine fallback text (aiUsed=false).");
  }, [plan.aiUsed]);

  return (
    <>
      <div className="flex flex-col gap-8 print:hidden">
        <StepOneCard step={plan.stepOne} />
        <SproutIntro plan={plan} profile={profile} />
        <SpendingPlan plan={plan} />
        <GoalsProgress allocation={plan.allocation} />
        <Roadmap plan={plan} />
        <NotYetCard items={plan.notYet} />
        <BankerCta summary={plan.bankerSummary} />
        <Button type="button" variant="outline" size="lg" onClick={() => window.print()} className="-mt-4 h-11 gap-2 self-center px-5">
          <Printer aria-hidden /> Save for my banker (PDF)
        </Button>
        <p className="text-sm text-muted-foreground">{plan.disclaimer}</p>
        <ChatPanel plan={plan} profile={profile} />
      </div>
      <PrintPlan plan={plan} profile={profile} />
    </>
  );
}
