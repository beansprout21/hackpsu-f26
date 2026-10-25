"use client";

import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import type { Plan, Stage } from "@/types";
import { GoalsSummary } from "./GoalsProgress";
import { StageTiles, type StageInfo } from "./Roadmap";
import { BankerCta, StepOneCard } from "./sections";
import { SpendingSummary } from "./SpendingPlan";

function SummaryCard({ title, more, onMore, children }: { title: string; more: string; onMore: () => void; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl bg-card p-6 shadow-card">
      <header className="flex items-center justify-between gap-2">
        <h2 className="text-body font-semibold">{title}</h2>
        <button
          type="button"
          onClick={onMore}
          className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-small font-semibold text-brand-700 outline-none transition-colors hover:bg-brand-50 focus-visible:ring-4 focus-visible:ring-ring/30"
        >
          {more}
          <ArrowRight className="size-4" aria-hidden />
        </button>
      </header>
      {children}
    </section>
  );
}

// The dashboard's home: what to do this week, who to talk to, and one card per section.
export function Overview({
  plan,
  stages,
  onTab,
  onStage,
  actions,
}: {
  plan: Plan;
  stages: StageInfo[];
  onTab: (tab: "money" | "goals" | "roadmap") => void;
  onStage: (stage: Stage) => void;
  actions: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-8 md:grid-cols-2">
        <StepOneCard step={plan.stepOne} />
        <BankerCta summary={plan.bankerSummary}>{actions}</BankerCta>
      </div>

      <SummaryCard title="Your roadmap" more="Open roadmap" onMore={() => onTab("roadmap")}>
        <StageTiles stages={stages} onSelect={onStage} />
      </SummaryCard>

      <div className="grid gap-8 md:grid-cols-2">
        <SummaryCard title="Your money" more="Details" onMore={() => onTab("money")}>
          <SpendingSummary plan={plan} />
        </SummaryCard>
        <SummaryCard title="Your goals" more="Details" onMore={() => onTab("goals")}>
          <GoalsSummary allocation={plan.allocation} />
        </SummaryCard>
      </div>
    </div>
  );
}
