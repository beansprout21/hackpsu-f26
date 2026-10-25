"use client";

import { ArrowRight, Calendar, CalendarClock, Flag, Hourglass, Shrub, Sprout, Trophy, TreeDeciduous, type LucideIcon } from "lucide-react";
import { AskChip } from "@/components/chat/AskSprout";
import { goalMeta } from "@/components/intake/copy";
import { cn } from "@/lib/utils";
import type { Match, Plan, PlanStep, Stage } from "@/types";
import { LIFE_EVENTS, productName, whenLabel } from "./format";
import { STEP_ICONS } from "./icons";
import { MatchRow, matchKey } from "./MatchRow";

// Semantic stage colors: success = start here, brand = next, warning = later.
// Growing icon sizes (seedling, shrub, tree) are a deliberate exception to "icon = line height".
const STAGES: {
  id: Stage;
  label: string;
  title: string;
  purpose: string;
  ask: string;
  icon: LucideIcon;
  size: string;
  dot: string;
  text: string;
  active: string;
}[] = [
  {
    id: "now",
    label: "Start here",
    title: "Set up the basics",
    purpose: "Get your money moving on its own, so the rest of the plan runs without extra effort.",
    ask: "Why should I do these first?",
    icon: Sprout,
    size: "size-5",
    dot: "bg-success-soft text-success",
    text: "text-success",
    active: "ring-2 ring-success bg-success-soft/40",
  },
  {
    id: "next",
    label: "Next",
    title: "Build momentum",
    purpose: "Once the basics are set, point your savings at the goals you care about.",
    ask: "What has to happen before I move on to Next?",
    icon: Shrub,
    size: "size-6",
    dot: "bg-brand-100 text-brand-600",
    text: "text-brand-600",
    active: "ring-2 ring-brand-600 bg-brand-50",
  },
  {
    id: "later",
    label: "Later",
    title: "Make the bigger moves",
    purpose: "These open up as your income and credit grow. Not yet, on purpose.",
    ask: "What do I need before the Later steps?",
    icon: TreeDeciduous,
    size: "size-7",
    dot: "bg-warning-soft text-warning",
    text: "text-warning",
    active: "ring-2 ring-warning bg-warning-soft/40",
  },
];

const isBigWin = (s: PlanStep) => /big win/i.test(s.title);

function whenRange(steps: PlanStep[]) {
  if (steps.length === 0) return null;
  const months = steps.map((s) => s.startMonth);
  const [lo, hi] = [Math.min(...months), Math.max(...months)];
  if (hi <= 0) return "Now";
  if (lo === hi) return whenLabel(lo);
  return lo <= 0 ? `Now to month ${hi}` : `Months ${lo}–${hi}`;
}

export type StageInfo = (typeof STAGES)[number] & { steps: PlanStep[]; matches: Match[]; when: string | null };

// Step one is shown first inside its own stage; the same step is skipped if it also appears in steps.
export function stagesFor(plan: Plan): StageInfo[] {
  const isStepOne = (s: PlanStep) => s.order === plan.stepOne.order && s.title === plan.stepOne.title;
  return STAGES.map((s) => {
    const rest = plan.steps.filter((x) => x.stage === s.id && !isStepOne(x));
    const steps = plan.stepOne.stage === s.id ? [plan.stepOne, ...rest] : rest;
    return { ...s, steps, matches: plan.matches.filter((m) => m.stage === s.id), when: whenRange(steps) };
  });
}

const count = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

// Three connected tiles. Used as the Roadmap tab's stage picker and as the Overview's mini roadmap.
export function StageTiles({
  stages,
  selected,
  onSelect,
}: {
  stages: StageInfo[];
  selected?: Stage;
  onSelect: (stage: Stage) => void;
}) {
  return (
    <ol className="relative grid grid-cols-3 gap-2 sm:gap-4">
      <span className="absolute inset-x-[16%] top-10 h-0.5 rounded-full bg-border" aria-hidden />
      {stages.map((s) => (
        <li key={s.id} className="relative">
          <button
            type="button"
            aria-current={selected === s.id ? "step" : undefined}
            onClick={() => onSelect(s.id)}
            className={cn(
              "flex w-full flex-col items-center gap-2 rounded-2xl bg-card p-4 text-center shadow-card outline-none transition-[box-shadow,background-color] duration-200 hover:shadow-raised focus-visible:ring-4 focus-visible:ring-ring/30",
              selected === s.id && s.active,
            )}
          >
            <span className={cn("flex size-12 items-center justify-center rounded-full", s.dot)} aria-hidden>
              <s.icon className={s.size} />
            </span>
            <span className={cn("text-small font-semibold", s.text)}>{s.label}</span>
            <span className="text-caption text-muted-foreground">
              {count(s.steps.length, "step")}
              <span className="hidden sm:inline">{s.when ? ` · ${s.when}` : ""}</span>
            </span>
          </button>
        </li>
      ))}
    </ol>
  );
}

function StepRow({ step, first }: { step: PlanStep; first: boolean }) {
  const bigWin = isBigWin(step);
  const Icon = bigWin ? Trophy : STEP_ICONS[step.kind];
  return (
    <li className={cn("flex gap-3 px-2 py-3", bigWin && "rounded-xl bg-brand-50 ring-2 ring-brand-400")}>
      <Icon className={cn("size-6 shrink-0", first ? "text-success" : "text-brand-600")} aria-hidden />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <span className="text-body font-semibold">{step.title}</span>
          {first ? (
            <span className="rounded-full bg-success-soft px-2 py-1 text-caption font-semibold text-success">This week</span>
          ) : (
            <span className="flex items-center gap-1 text-caption text-muted-foreground">
              <Calendar className="size-4" aria-hidden />
              {whenLabel(step.startMonth)}
            </span>
          )}
        </div>
        <span className="text-small text-muted-foreground">{step.detail}</span>
      </div>
    </li>
  );
}

function LaterExtras({ plan, matches }: { plan: Plan; matches: Match[] }) {
  const events = [...new Set(matches.flatMap((m) => (m.unlockTrigger?.kind === "life_event" ? [m.unlockTrigger.event] : [])))];
  return (
    <>
      {events.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {events.map((e) => (
            <span key={e} className="flex items-center gap-1 rounded-full bg-warning-soft px-3 py-1 text-small text-warning">
              <Flag className="size-5" aria-hidden />
              Milestone: {LIFE_EVENTS[e]}
            </span>
          ))}
        </div>
      )}
      {plan.notYet.length > 0 && (
        <div className="flex flex-col gap-2">
          <h4 className="flex items-center gap-2 text-caption font-semibold tracking-wide text-muted-foreground uppercase">
            <Hourglass className="size-4 text-warning" aria-hidden />
            Not yet, on purpose
          </h4>
          <ul className="flex flex-col divide-y divide-border">
            {plan.notYet.map((n, i) => (
              <li key={i} className="flex flex-col gap-1 px-2 py-3">
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
        </div>
      )}
    </>
  );
}

export function Roadmap({
  plan,
  stage,
  onStage,
  openKey,
  onOpenKey,
}: {
  plan: Plan;
  stage: Stage;
  onStage: (stage: Stage) => void;
  openKey: string | null;
  onOpenKey: (key: string | null) => void;
}) {
  const stages = stagesFor(plan);
  const i = stages.findIndex((s) => s.id === stage);
  const s = stages[i];
  const next = stages[i + 1];

  return (
    <div className="flex flex-col gap-6">
      <StageTiles stages={stages} selected={stage} onSelect={onStage} />

      <section
        key={s.id}
        aria-labelledby={`stage-${s.id}`}
        className="flex animate-in flex-col gap-6 rounded-2xl bg-card p-6 shadow-card duration-200 fade-in motion-reduce:animate-none"
      >
        <header className="flex flex-col gap-2">
          <h3 id={`stage-${s.id}`} className="text-lead font-semibold">
            <span className={s.text}>{s.label}:</span> {s.title}
          </h3>
          <p className="text-small text-muted-foreground">{s.purpose}</p>
          <AskChip question={s.ask} />
        </header>

        {s.steps.length > 0 && (
          <ul className="flex flex-col divide-y divide-border">
            {s.steps.map((step) => (
              <StepRow key={`${step.order}-${step.title}`} step={step} first={step === plan.stepOne} />
            ))}
          </ul>
        )}

        {s.matches.length > 0 && (
          <div className="flex flex-col gap-2">
            <h4 className="text-caption font-semibold tracking-wide text-muted-foreground uppercase">
              {count(s.matches.length, "product")} for this stage
            </h4>
            <ul className="flex flex-col divide-y divide-border">
              {s.matches.map((m) => (
                <MatchRow
                  key={matchKey(m)}
                  match={m}
                  open={openKey === matchKey(m)}
                  onToggle={(open) => onOpenKey(open ? matchKey(m) : null)}
                />
              ))}
            </ul>
          </div>
        )}

        {s.id === "later" && <LaterExtras plan={plan} matches={s.matches} />}

        {next && (
          <button
            type="button"
            onClick={() => onStage(next.id)}
            className="inline-flex items-center gap-2 self-end rounded-full px-3 py-2 text-small font-semibold text-brand-700 outline-none transition-colors hover:bg-brand-50 focus-visible:ring-4 focus-visible:ring-ring/30"
          >
            Then: {next.label}
            <ArrowRight className="size-5" aria-hidden />
          </button>
        )}
      </section>
    </div>
  );
}
