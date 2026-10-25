"use client";

import { useState, type ReactNode } from "react";
import { CalendarClock, Check, ChevronDown, Flag } from "lucide-react";
import { AskChip, useAskSprout } from "@/components/chat/AskSprout";
import { goalMeta } from "@/components/intake/copy";
import { cn } from "@/lib/utils";
import type { Match, Plan, PlanStep, Stage } from "@/types";
import { LIFE_EVENTS, productName } from "./format";
import { MatchRow, TrustLayer, matchKey } from "./MatchRow";
import { GuideStepRow, STAGES, productChip } from "./guide";
import type { GuideStep, OverviewModelV2 } from "./overviewV2";

export const stepKey = (s: PlanStep) => `${s.order}-${s.title}`;
// Done state for a guide step: step 1 shares Step one's key, so ticking it on Overview shows here too.
export const guideKey = (plan: Plan, s: GuideStep) => (s.kind === "move" ? stepKey(plan.stepOne) : `guide-${s.n}-${s.title}`);

const count = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

// Three connected tiles: jump links to each stage of the guide (a vertical rail on xl screens).
function StageTiles({
  totals,
  finished,
  onSelect,
}: {
  totals: Record<Stage, number>;
  finished: Record<Stage, number>;
  onSelect: (stage: Stage) => void;
}) {
  return (
    <ol className="relative grid grid-cols-3 gap-2 sm:gap-4 xl:grid-cols-1 xl:gap-3">
      <span
        className="absolute inset-x-[16%] top-10 h-0.5 rounded-full bg-border xl:top-[15%] xl:right-auto xl:bottom-[15%] xl:left-10 xl:h-auto xl:w-0.5"
        aria-hidden
      />
      {STAGES.map((s) => {
        const total = totals[s.id];
        const done = finished[s.id];
        return (
          <li key={s.id} className="relative">
            <button
              type="button"
              onClick={() => onSelect(s.id)}
              className="flex w-full flex-col items-center gap-2 rounded-2xl bg-card p-4 text-center shadow-card outline-none transition-[box-shadow,background-color] duration-200 hover:shadow-raised focus-visible:ring-4 focus-visible:ring-ring/30 xl:flex-row xl:gap-3 xl:text-left"
            >
              <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-full", s.dot)} aria-hidden>
                {total > 0 && done === total ? <Check className="size-6" /> : <s.icon className={s.size} />}
              </span>
              <span className="flex flex-col gap-1">
                <span className={cn("text-small font-semibold", s.text)}>{s.label}</span>
                <span className="text-caption text-muted-foreground">{done > 0 ? `${done} of ${total} done` : count(total, "step")}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

// A closed-by-default group with a count.
function Fold({
  label,
  open,
  onToggle,
  children,
}: {
  label: string;
  open: boolean;
  onToggle: (open: boolean) => void;
  children: ReactNode;
}) {
  return (
    <details
      open={open}
      onToggle={(e) => {
        if (e.currentTarget.open !== open) onToggle(e.currentTarget.open);
      }}
      className="group border-t border-border pt-2"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg px-2 py-2 text-small font-semibold text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-4 focus-visible:ring-ring/30 [&::-webkit-details-marker]:hidden">
        {label}
        <ChevronDown className="size-5 transition-transform duration-200 group-open:rotate-180" aria-hidden />
      </summary>
      <div className="pt-2">{children}</div>
    </details>
  );
}

function Milestones({ matches }: { matches: Match[] }) {
  const events = [...new Set(matches.flatMap((m) => (m.unlockTrigger?.kind === "life_event" ? [m.unlockTrigger.event] : [])))];
  if (events.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {events.map((e) => (
        <span key={e} className="flex items-center gap-1 rounded-full bg-warning-soft px-3 py-1 text-small text-warning">
          <Flag className="size-5" aria-hidden />
          Milestone: {LIFE_EVENTS[e]}
        </span>
      ))}
    </div>
  );
}

function DoneToggle({ done, onDone }: { done: boolean; onDone: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={done}
      onClick={onDone}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-xl px-4 text-small font-semibold outline-none transition-colors duration-200 focus-visible:ring-4 focus-visible:ring-ring/30 active:translate-y-px motion-reduce:transition-none",
        done ? "bg-success text-white" : "ring-1 ring-border ring-inset hover:bg-success-soft",
      )}
    >
      <Check className="size-4" aria-hidden />
      Done
    </button>
  );
}

// The Roadmap tab (docs/DASHBOARD.md v2): the same numbered guide as the Overview, full length, under
// "Start now" / "Next" / "Unlocks later"; each product step opens its trust layer.
export function Roadmap({
  plan,
  model,
  done,
  onDone,
  openKey,
  onOpenKey,
  onProduct,
}: {
  plan: Plan;
  model: OverviewModelV2;
  done: Set<string>;
  onDone: (key: string) => void;
  openKey: string | null;
  onOpenKey: (key: string | null) => void;
  onProduct: (productId: string) => void;
}) {
  const chips = useAskSprout().blockChips();
  const [otherOpen, setOtherOpen] = useState<Partial<Record<Stage, boolean>>>({});
  const [notYetOpen, setNotYetOpen] = useState(false);

  const matchFor = (s: GuideStep) => (s.productId ? plan.matches.find((m) => m.productId === s.productId) : undefined);
  const inGuide = new Set(model.steps.flatMap((s) => (s.productId ? [s.productId] : [])));
  const byStage = (id: Stage) => model.steps.filter((s) => s.stage === id);
  // Numbered in reading order here (stage by stage), so each section counts on from the one before.
  const shown = new Map(STAGES.flatMap((s) => byStage(s.id)).map((step, i) => [step, i + 1]));
  const totals = { now: byStage("now").length, next: byStage("next").length, later: byStage("later").length };
  const finished = Object.fromEntries(
    STAGES.map((s) => [s.id, byStage(s.id).filter((x) => done.has(guideKey(plan, x))).length]),
  ) as Record<Stage, number>;

  const jump = (id: Stage) => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById(`stage-${id}`)?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  };

  return (
    <div className="flex flex-col gap-6 xl:grid xl:grid-cols-[13rem_minmax(0,1fr)] xl:items-start">
      <div className="xl:sticky xl:top-36">
        <StageTiles totals={totals} finished={finished} onSelect={jump} />
      </div>

      <div className="flex min-w-0 flex-col gap-6">
        {STAGES.map((s) => {
          const steps = byStage(s.id);
          const others = plan.matches.filter((m) => m.stage === s.id && !inGuide.has(m.productId));
          const citedHere = others.some((m) => matchKey(m) === openKey);
          return (
            <section
              key={s.id}
              id={`stage-${s.id}`}
              aria-labelledby={`stage-${s.id}-title`}
              className="flex scroll-mt-36 flex-col gap-4 rounded-2xl bg-card p-6 shadow-card"
            >
              <header className="flex flex-col gap-1">
                <h3 id={`stage-${s.id}-title`} className="text-lead font-semibold">
                  <span className={s.text}>{s.label}:</span> {s.title}
                </h3>
                <p className="text-small text-muted-foreground">{s.purpose}</p>
              </header>

              {s.id === "later" && <Milestones matches={plan.matches.filter((m) => m.stage === "later")} />}

              {steps.length > 0 ? (
                <ol className="flex flex-col">
                  {steps.map((step, i) => {
                    const match = matchFor(step);
                    const key = match ? matchKey(match) : null;
                    const open = key !== null && openKey === key;
                    return (
                      <GuideStepRow
                        key={step.n}
                        id={key ? `product-${key}` : undefined}
                        step={{ ...step, n: shown.get(step) ?? step.n }}
                        last={i === steps.length - 1}
                        chip={step.kind === "move" ? chips.nextMove[0] : productChip(chips, step.productId)}
                        onProduct={onProduct}
                        after={
                          match &&
                          open && (
                            <TrustLayer
                              match={match}
                              className="mt-2 animate-in rounded-xl bg-brand-50 p-4 duration-200 fade-in slide-in-from-top-1 motion-reduce:animate-none"
                            />
                          )
                        }
                      >
                          <DoneToggle done={done.has(guideKey(plan, step))} onDone={() => onDone(guideKey(plan, step))} />
                          {match && (
                            <button
                              type="button"
                              aria-expanded={open}
                              onClick={() => onOpenKey(open ? null : key)}
                              className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-small font-semibold text-brand-700 outline-none transition-colors hover:bg-brand-50 focus-visible:ring-4 focus-visible:ring-ring/30"
                            >
                              Why it fits, terms, and source
                              <ChevronDown className={cn("size-4 transition-transform duration-200", open && "rotate-180")} aria-hidden />
                            </button>
                          )}
                      </GuideStepRow>
                    );
                  })}
                </ol>
              ) : (
                <p className="text-small text-muted-foreground">Nothing to do here yet. Sprout will add steps as your plan grows.</p>
              )}

              {others.length > 0 && (
                <Fold
                  label={`Other FNB options for this stage (${others.length})`}
                  open={!!otherOpen[s.id] || citedHere}
                  onToggle={(open) => {
                    setOtherOpen((o) => ({ ...o, [s.id]: open }));
                    if (!open && citedHere) onOpenKey(null);
                  }}
                >
                  <ul className="flex flex-col divide-y divide-border">
                    {others.map((m) => (
                      <MatchRow key={matchKey(m)} match={m} open={openKey === matchKey(m)} onToggle={(open) => onOpenKey(open ? matchKey(m) : null)} />
                    ))}
                  </ul>
                </Fold>
              )}

              {s.id === "later" && plan.notYet.length > 0 && (
                <Fold label={`Not yet, on purpose (${plan.notYet.length})`} open={notYetOpen} onToggle={setNotYetOpen}>
                  <ul className="flex flex-col gap-4 px-2">
                    {plan.notYet.map((n, k) => (
                      <li key={k} className="flex flex-col gap-1">
                        <span className="text-body font-semibold">
                          {n.productId ? productName(n.productId) : n.goalId ? goalMeta(n.goalId).label : "Holding off"}
                        </span>
                        <span className="text-small">{n.reason}</span>
                        <span className="flex items-center gap-1 text-caption text-muted-foreground">
                          <CalendarClock className="size-4" aria-hidden />
                          Revisit {n.revisitWhen}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Fold>
              )}

              <AskChip question={s.ask} />
            </section>
          );
        })}
      </div>
    </div>
  );
}
