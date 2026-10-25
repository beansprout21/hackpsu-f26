"use client";

import { useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  Check,
  ChevronDown,
  Flag,
  Shrub,
  Sprout,
  Trophy,
  TreeDeciduous,
  type LucideIcon,
} from "lucide-react";
import { AskChip } from "@/components/chat/AskSprout";
import { goalMeta } from "@/components/intake/copy";
import { cn } from "@/lib/utils";
import type { Match, Plan, PlanStep, Stage } from "@/types";
import { LIFE_EVENTS, productName, whenLabel } from "./format";
import { STEP_ICONS } from "./icons";
import { MatchRow, matchKey } from "./MatchRow";

// Semantic stage colors: success = start here, brand = next, warning = later.
// Growing icon sizes (seedling, shrub, tree) are a deliberate exception to "icon = line height".
// Selected tints are mixed with the card color, not alpha, so the connector line can't show through a tile.
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
    purpose: "A few small moves that make the rest of the plan run on its own.",
    ask: "Why should I do these first?",
    icon: Sprout,
    size: "size-5",
    dot: "bg-success-soft text-success",
    text: "text-success",
    active: "ring-2 ring-success bg-[color-mix(in_oklab,var(--color-success-soft)_40%,var(--color-card))]",
  },
  {
    id: "next",
    label: "Next",
    title: "Build momentum",
    purpose: "Once the basics are set, point your savings at your goals.",
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
    active: "ring-2 ring-warning bg-[color-mix(in_oklab,var(--color-warning-soft)_40%,var(--color-card))]",
  },
];

const TOP_TASKS = 3;
const isBigWin = (s: PlanStep) => /big win/i.test(s.title);
export const stepKey = (s: PlanStep) => `${s.order}-${s.title}`;

function whenRange(steps: PlanStep[]) {
  if (steps.length === 0) return null;
  const months = steps.map((s) => s.startMonth);
  const [lo, hi] = [Math.min(...months), Math.max(...months)];
  if (hi <= 0) return "Now";
  if (lo === hi) return whenLabel(lo);
  return lo <= 0 ? `Now to month ${hi}` : `Months ${lo}–${hi}`;
}

export type StageInfo = (typeof STAGES)[number] & { steps: PlanStep[]; matches: Match[]; when: string | null };

// Steps per stage, most important first: Step one, then any Big Win, then plan order.
export function stagesFor(plan: Plan): StageInfo[] {
  const isStepOne = (s: PlanStep) => s.order === plan.stepOne.order && s.title === plan.stepOne.title;
  const rank = (s: PlanStep) => (s === plan.stepOne ? 0 : isBigWin(s) ? 1 : 2);
  return STAGES.map((s) => {
    const rest = plan.steps.filter((x) => x.stage === s.id && !isStepOne(x));
    const steps = (plan.stepOne.stage === s.id ? [plan.stepOne, ...rest] : rest).sort(
      (a, b) => rank(a) - rank(b) || a.order - b.order,
    );
    return { ...s, steps, matches: plan.matches.filter((m) => m.stage === s.id), when: whenRange(steps) };
  });
}

const count = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

// Three connected tiles. Used as the Roadmap tab's stage picker and as the Overview's mini roadmap.
export function StageTiles({
  stages,
  selected,
  done,
  onSelect,
}: {
  stages: StageInfo[];
  selected?: Stage;
  done?: Set<string>;
  onSelect: (stage: Stage) => void;
}) {
  return (
    <ol className="relative grid grid-cols-3 gap-2 sm:gap-4">
      <span className="absolute inset-x-[16%] top-10 h-0.5 rounded-full bg-border" aria-hidden />
      {stages.map((s) => {
        const finished = done ? s.steps.filter((x) => done.has(stepKey(x))).length : 0;
        return (
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
                {s.steps.length > 0 && finished === s.steps.length ? <Check className="size-6" /> : <s.icon className={s.size} />}
              </span>
              <span className={cn("text-small font-semibold", s.text)}>{s.label}</span>
              <span className="text-caption text-muted-foreground">
                {finished > 0 ? `${finished} of ${s.steps.length} done` : s.when ?? count(s.steps.length, "task")}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

// One task = one line. Tap to read its 1–2 sentence detail; tick the circle when it's done.
function TaskRow({
  step,
  first,
  open,
  done,
  onOpen,
  onDone,
  onProduct,
}: {
  step: PlanStep;
  first: boolean;
  open: boolean;
  done: boolean;
  onOpen: () => void;
  onDone: () => void;
  onProduct: (productId: string) => void;
}) {
  const Icon = isBigWin(step) ? Trophy : STEP_ICONS[step.kind];
  return (
    <li className={cn("rounded-xl transition-colors duration-200", open && "bg-brand-50")}>
      <div className="flex items-center gap-3 px-2 py-2">
        <button
          type="button"
          role="checkbox"
          aria-checked={done}
          aria-label={`Mark "${step.title}" done`}
          onClick={onDone}
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-full border-2 outline-none transition-colors duration-200 focus-visible:ring-4 focus-visible:ring-ring/30",
            done ? "border-success bg-success text-white" : "border-border bg-card hover:border-success",
          )}
        >
          {done && <Check className="size-4 animate-in zoom-in-50 duration-150 motion-reduce:animate-none" aria-hidden />}
        </button>
        <button
          type="button"
          aria-expanded={open}
          onClick={onOpen}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-lg py-1 text-left outline-none focus-visible:ring-4 focus-visible:ring-ring/30"
        >
          <Icon className="hidden size-5 shrink-0 text-brand-600 sm:block" aria-hidden />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className={cn("text-body font-semibold", done && "text-muted-foreground line-through")}>{step.title}</span>
            <span className={cn("text-caption sm:hidden", first ? "font-semibold text-success" : "text-muted-foreground")}>
              {first ? "This week" : whenLabel(step.startMonth)}
            </span>
          </span>
          {first ? (
            <span className="hidden shrink-0 rounded-full bg-success-soft px-2 py-1 text-caption font-semibold text-success sm:inline">
              This week
            </span>
          ) : (
            <span className="hidden shrink-0 text-caption text-muted-foreground sm:inline">{whenLabel(step.startMonth)}</span>
          )}
          <ChevronDown
            className={cn("size-5 shrink-0 text-muted-foreground transition-transform duration-200", open && "rotate-180")}
            aria-hidden
          />
        </button>
      </div>
      {open && (
        <div className="flex animate-in flex-col gap-2 pr-4 pb-4 pl-12 duration-200 sm:pl-20 fade-in slide-in-from-top-1 motion-reduce:animate-none">
          <p className="text-small">{step.detail}</p>
          {step.productId && (
            <button
              type="button"
              onClick={() => onProduct(step.productId!)}
              className="inline-flex items-center gap-1 self-start rounded-full bg-brand-100 px-3 py-1 text-caption font-semibold text-brand-700 outline-none transition-colors hover:bg-brand-200 focus-visible:ring-4 focus-visible:ring-ring/30"
            >
              About {productName(step.productId)}
              <ArrowRight className="size-4" aria-hidden />
            </button>
          )}
        </div>
      )}
    </li>
  );
}

// A closed-by-default group with a count, for everything beyond the top tasks.
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

export function Roadmap({
  plan,
  stage,
  onStage,
  done,
  onDone,
  openKey,
  onOpenKey,
  onProduct,
}: {
  plan: Plan;
  stage: Stage;
  onStage: (stage: Stage) => void;
  done: Set<string>;
  onDone: (key: string) => void;
  openKey: string | null;
  onOpenKey: (key: string | null) => void;
  onProduct: (productId: string) => void;
}) {
  const stages = stagesFor(plan);
  const i = stages.findIndex((s) => s.id === stage);
  const s = stages[i];
  const [prev, next] = [stages[i - 1], stages[i + 1]];

  const [openTask, setOpenTask] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);
  const [notYetOpen, setNotYetOpen] = useState(false);

  const top = s.steps.slice(0, TOP_TASKS);
  const more = s.steps.slice(TOP_TASKS);
  const topDone = top.length > 0 && top.every((x) => done.has(stepKey(x)));
  const citedHere = s.matches.some((m) => matchKey(m) === openKey);

  const go = (to: Stage) => {
    setOpenTask(null);
    setShowMore(false);
    setProductsOpen(false);
    setNotYetOpen(false);
    onStage(to);
  };

  const task = (step: PlanStep) => (
    <TaskRow
      key={stepKey(step)}
      step={step}
      first={step === plan.stepOne}
      open={openTask === stepKey(step)}
      done={done.has(stepKey(step))}
      onOpen={() => setOpenTask(openTask === stepKey(step) ? null : stepKey(step))}
      onDone={() => onDone(stepKey(step))}
      onProduct={onProduct}
    />
  );

  return (
    <div className="flex flex-col gap-6">
      <StageTiles stages={stages} selected={stage} done={done} onSelect={go} />

      <section
        key={s.id}
        aria-labelledby={`stage-${s.id}`}
        className="flex animate-in flex-col gap-4 rounded-2xl bg-card p-6 shadow-card duration-200 fade-in motion-reduce:animate-none"
      >
        <header className="flex flex-col gap-1">
          <span className="text-caption font-semibold tracking-wide text-muted-foreground uppercase">
            Stage {i + 1} of {stages.length}
          </span>
          <h3 id={`stage-${s.id}`} className="text-lead font-semibold">
            <span className={s.text}>{s.label}:</span> {s.title}
          </h3>
          <p className="text-small text-muted-foreground">{s.purpose}</p>
        </header>

        {s.id === "later" && <Milestones matches={s.matches} />}

        {top.length > 0 ? (
          <ul className="flex flex-col gap-1">{top.map(task)}</ul>
        ) : (
          <p className="text-small text-muted-foreground">Nothing to do here yet. Sprout will add steps as your plan grows.</p>
        )}

        {more.length > 0 && (
          <Fold label={`More when you're ready (${more.length})`} open={showMore} onToggle={setShowMore}>
            <ul className="flex flex-col gap-1">{more.map(task)}</ul>
          </Fold>
        )}

        {s.matches.length > 0 && (
          <Fold
            label={`Products for this stage (${s.matches.length})`}
            open={productsOpen || citedHere}
            onToggle={(open) => {
              setProductsOpen(open);
              if (!open) onOpenKey(null);
            }}
          >
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

        <footer className="flex items-center justify-between gap-2 border-t border-border pt-4">
          {prev ? (
            <button
              type="button"
              onClick={() => go(prev.id)}
              className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-small font-semibold text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-4 focus-visible:ring-ring/30"
            >
              <ArrowLeft className="size-5" aria-hidden />
              {prev.label}
            </button>
          ) : (
            <span />
          )}
          {next && (
            <button
              type="button"
              onClick={() => go(next.id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-4 py-2 text-small font-semibold outline-none transition-colors duration-200 focus-visible:ring-4 focus-visible:ring-ring/30",
                topDone
                  ? "bg-highlight text-highlight-foreground hover:bg-highlight/90"
                  : "text-brand-700 hover:bg-brand-50",
              )}
            >
              {topDone ? `Nice work. On to ${next.label}` : `Then: ${next.label}`}
              <ArrowRight className="size-5" aria-hidden />
            </button>
          )}
        </footer>
      </section>
    </div>
  );
}
