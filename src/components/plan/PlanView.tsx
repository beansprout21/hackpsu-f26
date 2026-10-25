"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Tabs } from "@base-ui/react/tabs";
import { LayoutDashboard, Map, Printer, Target, Wallet } from "lucide-react";
import { AskSproutMobile, AskSproutProvider, SproutCopilot } from "@/components/chat/AskSprout";
import { SharePlanCard } from "@/components/share/SharePlanCard";
import { buildOverview } from "@/lib/client/overview";
import { useAppState } from "@/lib/client/state";
import type { FinancialSnapshot, GoalProfile, Plan } from "@/types";
import { GoalsProgress } from "./GoalsProgress";
import { matchKey } from "./MatchRow";
import { Overview } from "./Overview";
import { PrintPlan } from "./PrintPlan";
import { Roadmap, stepKey } from "./Roadmap";
import { SummaryHeader } from "./sections";
import { SpendingPlan } from "./SpendingPlan";

// /plan?mock= demo plans arrive without a snapshot; rebuild the fields the Overview reads from the plan.
function snapshotFromPlan(plan: Plan): FinancialSnapshot {
  return {
    hasSteadyIncome: false,
    incomeSources: [],
    monthlyFixedCosts: plan.spendingPlan.find((b) => b.bucket === "fixed_costs")?.monthlyAmount ?? 0,
    monthlyDebtPayments: 0,
    savingsBalance: 0,
    creditBand: "unsure",
    isFnbCustomer: false,
  };
}

const TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "money", label: "Money", icon: Wallet },
  { id: "goals", label: "Goals", icon: Target },
  { id: "roadmap", label: "Roadmap", icon: Map },
] as const;
type TabId = (typeof TABS)[number]["id"];

const readHash = (): TabId => {
  const hash = window.location.hash.slice(1);
  return TABS.some((t) => t.id === hash) ? (hash as TabId) : "overview";
};

// Dashboard (#58): summary + stat tiles on top, one tab at a time below, Ask Sprout docked on the
// right (desktop) or as a card + sheet (phones). The open tab lives in the URL hash.
export function PlanView({ plan, profile }: { plan: Plan; profile: GoalProfile }) {
  const [tab, setTabState] = useState<TabId>(readHash);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [focus, setFocus] = useState<{ key: string; tick: number } | null>(null);
  const [done, setDone] = useState<Set<string>>(() => new Set());
  const [app] = useAppState();
  const snapshot = useMemo(() => app.snapshot ?? snapshotFromPlan(plan), [app.snapshot, plan]);
  const overview = useMemo(() => buildOverview(plan, profile, snapshot), [plan, profile, snapshot]);

  const toggleDone = useCallback((key: string) => {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!plan.aiUsed) console.info("[plan] Rendering engine fallback text (aiUsed=false).");
  }, [plan.aiUsed]);

  useEffect(() => {
    const onPop = () => setTabState(readHash());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const setTab = useCallback((next: TabId) => {
    setTabState(next);
    if (window.location.hash !== `#${next}`) window.history.pushState(null, "", `#${next}`);
  }, []);

  // A product cited in Ask Sprout (or tapped in the guide): open Roadmap and its trust layer, then scroll to it.
  const cite = useCallback(
    (productId: string) => {
      const match = plan.matches.find((m) => m.productId === productId);
      setTab("roadmap");
      if (!match) return;
      setOpenKey(matchKey(match));
      setFocus({ key: matchKey(match), tick: Date.now() });
    },
    [plan.matches, setTab],
  );

  // Wait two frames so the tab switch and the opened trust layer are laid out before scrolling.
  useEffect(() => {
    if (!focus) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() =>
        document.getElementById(`product-${focus.key}`)?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" }),
      );
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [focus]);

  return (
    <AskSproutProvider plan={plan} profile={profile} onCite={cite}>
      <div className="grid items-start gap-8 pb-24 lg:grid-cols-[minmax(0,1fr)_24rem] lg:pb-0 xl:grid-cols-[minmax(0,1fr)_28rem] print:hidden">
        <div className="flex min-w-0 flex-col gap-8">
          <SummaryHeader plan={plan} profile={profile} />
          <AskSproutMobile />

          <Tabs.Root value={tab} onValueChange={(v) => setTab(v as TabId)} className="flex flex-col gap-6">
            <Tabs.List
              aria-label="Plan sections"
              className="sticky top-[4.5rem] z-30 flex gap-1 rounded-2xl bg-card p-1 shadow-card"
            >
              {TABS.map((t) => (
                <Tabs.Tab
                  key={t.id}
                  value={t.id}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl px-2 py-2 text-small font-semibold text-muted-foreground outline-none transition-colors duration-200 hover:bg-brand-50 hover:text-foreground focus-visible:ring-4 focus-visible:ring-ring/30 data-[active]:bg-brand-100 data-[active]:text-brand-700"
                >
                  <t.icon className="hidden size-5 sm:block" aria-hidden />
                  {t.label}
                </Tabs.Tab>
              ))}
            </Tabs.List>

            <Tabs.Panel value="overview" className="outline-none">
              <Overview
                model={overview}
                personaId={profile.persona.id}
                bankerSummary={plan.bankerSummary}
                stepOneDone={done.has(stepKey(plan.stepOne))}
                onStepOneDone={() => toggleDone(stepKey(plan.stepOne))}
                onTab={setTab}
                onProduct={cite}
                actions={
                  <>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-small font-semibold ring-1 ring-border outline-none transition-colors ring-inset hover:bg-brand-50 focus-visible:ring-4 focus-visible:ring-ring/30"
                    >
                      <Printer className="size-5" aria-hidden /> Save for my banker (PDF)
                    </button>
                    <Link
                      href="/banker"
                      className="self-center text-caption text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                    >
                      Banker view (demo)
                    </Link>
                  </>
                }
                share={<SharePlanCard plan={plan} profile={profile} />}
              />
            </Tabs.Panel>
            <Tabs.Panel value="money" className="outline-none">
              <SpendingPlan plan={plan} snapshot={snapshot} />
            </Tabs.Panel>
            <Tabs.Panel value="goals" className="outline-none">
              <GoalsProgress allocation={plan.allocation} />
            </Tabs.Panel>
            <Tabs.Panel value="roadmap" className="outline-none">
              <Roadmap
                plan={plan}
                model={overview}
                done={done}
                onDone={toggleDone}
                openKey={openKey}
                onOpenKey={setOpenKey}
                onProduct={cite}
              />
            </Tabs.Panel>
          </Tabs.Root>

          <p className="text-caption text-muted-foreground">{plan.disclaimer}</p>
        </div>

        <SproutCopilot />
      </div>
      <PrintPlan plan={plan} profile={profile} />
    </AskSproutProvider>
  );
}
