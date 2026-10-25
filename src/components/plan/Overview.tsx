"use client";

import type { ReactNode } from "react";
import { ArrowRight, Check, CircleCheck, CircleHelp, ExternalLink, Hourglass, Sparkles, Sprout, TrendingUp, type LucideIcon } from "lucide-react";
import { AskChip, useAskSprout } from "@/components/chat/AskSprout";
import type { BlockChips, Chip } from "@/lib/client/chatCopy";
import { PERSONA_ICONS } from "@/components/sprout/personaIcons";
import type { OverviewModel } from "@/lib/client/overview";
import * as copy from "@/lib/client/planCopy";
import { cn } from "@/lib/utils";
import type { PersonaId, Stage, StepKind } from "@/types";
import { BUCKETS, usd } from "./format";
import { STEP_ICONS } from "./icons";
import { stageMeta } from "./Roadmap";
import { BankerCta } from "./sections";

type Tab = "money" | "goals" | "roadmap";

// The small "?" on each block: asks that block's first chip from blockChips() (docs/ASK_SPROUT.md).
function HelpChip({ chip, className }: { chip?: Chip; className?: string }) {
  const { ask, busy } = useAskSprout();
  if (!chip) return null;
  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => void ask(chip)}
      aria-label={chip.label}
      title={chip.label}
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-highlight/10 text-highlight outline-none transition-colors duration-200 hover:bg-highlight/20 focus-visible:ring-4 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
    >
      <CircleHelp className="size-5" aria-hidden />
    </button>
  );
}

// One Overview block: Ethan's card, a title, its "?" chip, and an optional link to the tab with the detail.
function Block({
  id,
  title,
  help,
  more,
  onMore,
  className,
  children,
}: {
  id: string;
  title: string;
  help?: Chip;
  more?: string;
  onMore?: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className={cn("flex flex-col gap-4 rounded-2xl bg-card p-6 shadow-card", className)}>
      <header className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          <h2 id={id} className="text-body font-semibold">
            {title}
          </h2>
          <HelpChip chip={help} />
        </span>
        {more && onMore && (
          <button
            type="button"
            onClick={onMore}
            className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-small font-semibold text-brand-700 outline-none transition-colors hover:bg-brand-50 focus-visible:ring-4 focus-visible:ring-ring/30"
          >
            {more}
            <ArrowRight className="size-4" aria-hidden />
          </button>
        )}
      </header>
      {children}
    </section>
  );
}

// 1. Your next move: persona chip, Step one (templates), Done, "Why this first?", and the FNB fit under it.
function NextMove({
  model,
  chips,
  personaId,
  stepKind,
  done,
  onDone,
  onProduct,
}: {
  model: OverviewModel;
  chips: BlockChips;
  personaId: PersonaId;
  stepKind: StepKind;
  done: boolean;
  onDone: () => void;
  onProduct: (productId: string) => void;
}) {
  const PersonaIcon = PERSONA_ICONS[personaId];
  const StepIcon = STEP_ICONS[stepKind];
  const { nextMove, fnbFit, persona } = model;
  return (
    <section aria-labelledby="next-move" className="flex flex-col gap-4 rounded-2xl bg-card p-6 shadow-card ring-2 ring-success/30">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="next-move" className="flex items-center gap-2 text-caption font-semibold tracking-wide text-success uppercase">
          <StepIcon className="size-5" aria-hidden />
          {copy.BLOCK_TITLES.nextMove}
        </h2>
        <span
          title={persona.tagline}
          className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-3 py-1 text-caption font-semibold text-brand-700"
        >
          <PersonaIcon className="size-4 text-foreground" aria-hidden />
          {persona.label}
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <p className={cn("text-lead font-semibold text-balance", done && "text-muted-foreground line-through")}>{nextMove.title}</p>
        <p className="text-small text-muted-foreground">{nextMove.detail}</p>
      </div>

      {nextMove.link && (
        <a
          href={nextMove.link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 self-start text-small font-semibold text-info underline-offset-4 hover:underline focus-visible:ring-4 focus-visible:ring-info/30 focus-visible:outline-none"
        >
          {copy.CREDIT_REPORT_LINK_LABEL}
          <ExternalLink className="size-4" aria-hidden />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          aria-pressed={done}
          onClick={onDone}
          className={cn(
            "inline-flex h-11 items-center gap-2 rounded-xl px-5 text-small font-semibold outline-none transition-colors duration-200 focus-visible:ring-4 focus-visible:ring-ring/30 active:translate-y-px motion-reduce:transition-none",
            done ? "bg-success text-white" : "ring-1 ring-border ring-inset hover:bg-success-soft",
          )}
        >
          <Check className={cn("size-5", done && "animate-in zoom-in-50 duration-150 motion-reduce:animate-none")} aria-hidden />
          {copy.DONE_LABEL}
        </button>
        {done && (
          <span role="status" className="animate-in fade-in text-small font-semibold text-success duration-200 motion-reduce:animate-none">
            {copy.DONE_MESSAGE}
          </span>
        )}
        {chips.nextMove[0] && <AskChip chip={chips.nextMove[0]} className="self-center" />}
      </div>

      {fnbFit && (
        <div className="flex items-start gap-2 rounded-xl bg-brand-50 pr-3">
          <button
            type="button"
            onClick={() => onProduct(fnbFit.productId)}
            className="flex min-w-0 flex-1 flex-col gap-1 rounded-xl px-4 py-3 text-left outline-none transition-colors hover:bg-brand-100 focus-visible:ring-4 focus-visible:ring-ring/30"
          >
            <span className="text-caption font-semibold tracking-wide text-brand-700 uppercase">{copy.FNB_FIT_LABEL}</span>
            <span className="text-body font-semibold">{fnbFit.name}</span>
            <span className="text-small text-muted-foreground">{fnbFit.line}</span>
          </button>
          <HelpChip chip={chips.fnbFit[0]} className="mt-3" />
        </div>
      )}
    </section>
  );
}

// 2. Your month: one sentence and one 3-part bar (safety cushion / goals / guilt-free).
function Month({ model, chips, onTab }: { model: OverviewModel; chips: BlockChips; onTab: (tab: Tab) => void }) {
  const { bar } = model.month;
  const parts = [
    { key: "cushion", label: copy.MONTH_BAR_LABELS.cushion, amount: bar.cushion, color: BUCKETS.emergency_fund.color },
    { key: "goals", label: copy.MONTH_BAR_LABELS.goals, amount: bar.goals, color: BUCKETS.goal_savings.color },
    { key: "guiltFree", label: copy.MONTH_BAR_LABELS.guiltFree, amount: bar.guiltFree, color: BUCKETS.guilt_free.color },
  ];
  const total = parts.reduce((s, p) => s + p.amount, 0);
  return (
    <Block id="your-month" title={copy.BLOCK_TITLES.month} help={chips.month[0]} more={copy.DETAILS_LABEL} onMore={() => onTab("money")}>
      <p className="text-lead font-semibold text-balance">{model.month.sentence}</p>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted" role="img" aria-label={parts.map((p) => `${p.label} ${usd(p.amount)}`).join(", ")}>
        {total > 0 && parts.map((p) => <span key={p.key} className={cn("h-full", p.color)} style={{ width: `${(100 * p.amount) / total}%` }} />)}
      </div>
      <ul className="grid grid-cols-3 gap-2">
        {parts.map((p) => (
          <li key={p.key} className="flex flex-col gap-0.5">
            <span className="flex items-center gap-2 text-caption text-muted-foreground">
              <span className={cn("size-2 shrink-0 rounded-full", p.color)} aria-hidden />
              {p.label}
            </span>
            <span className="text-body font-semibold tabular-nums">{usd(p.amount)}</span>
          </li>
        ))}
      </ul>
    </Block>
  );
}

// 3. Your safety cushion: target, reason, progress bar with the "1 month covered" marker.
function Cushion({ model, chips, onTab }: { model: OverviewModel; chips: BlockChips; onTab: (tab: Tab) => void }) {
  const c = model.cushion;
  const markAt = c.target > 0 ? Math.min(100, (100 * c.milestone) / c.target) : 0;
  const showMark = !c.met && c.milestone < c.target;
  return (
    <Block id="your-cushion" title={c.title} help={chips.cushion[0]} more={copy.DETAILS_LABEL} onMore={() => onTab("money")}>
      <p className="text-small text-muted-foreground">{c.reason}</p>
      <div className={cn("flex flex-col gap-1", showMark && "pb-5")}>
        <div className="relative">
          <div
            className="h-3 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={c.target}
            aria-valuenow={c.saved}
            aria-label={copy.BLOCK_TITLES.cushion}
          >
            <span className={cn("block h-full rounded-full", c.met ? "bg-success" : BUCKETS.emergency_fund.color)} style={{ width: `${c.pct}%` }} />
          </div>
          {showMark && (
            <span className="absolute top-0 flex -translate-x-1/2 flex-col items-center" style={{ left: `${markAt}%` }}>
              <span className="h-3 w-0.5 rounded-full bg-foreground/60" aria-hidden />
              <span className="mt-1 text-caption whitespace-nowrap text-muted-foreground">{copy.MILESTONE_LABEL}</span>
            </span>
          )}
        </div>
      </div>
      <p className={cn("text-small font-semibold tabular-nums", c.met && "text-success")}>{c.progressLine}</p>
      <p className="text-caption text-muted-foreground">{c.note}</p>
    </Block>
  );
}

// 4. Your goals: one line each; tone as an icon (never red); the P1 lever opens Ask Sprout.
const TONE: Record<OverviewModel["goals"][number]["tone"], { icon: LucideIcon; className: string }> = {
  gap: { icon: TrendingUp, className: "text-warning" },
  on_track: { icon: CircleCheck, className: "text-success" },
  on_path: { icon: Sprout, className: "text-brand-600" },
  later: { icon: Hourglass, className: "text-muted-foreground" },
};

// The P1 lever: shows lever.label, asks lever.askSprout (with the chip's intent when blockChips has it).
function LeverButton({ label, chip, question }: { label: string; chip?: Chip; question: string }) {
  const { ask, busy } = useAskSprout();
  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => void ask(chip ?? question)}
      className="ml-7 inline-flex items-center gap-1 self-start rounded-full bg-highlight/10 px-3 py-1 text-left text-small font-medium text-highlight outline-none transition-colors duration-200 hover:bg-highlight/20 focus-visible:ring-4 focus-visible:ring-ring/30 active:bg-highlight/25 disabled:pointer-events-none disabled:opacity-50"
    >
      <Sparkles className="size-4 shrink-0" aria-hidden />
      {label}
    </button>
  );
}

function Goals({ model, chips, onTab }: { model: OverviewModel; chips: BlockChips; onTab: (tab: Tab) => void }) {
  if (model.goals.length === 0) return null;
  return (
    <Block id="your-goals" title={copy.BLOCK_TITLES.goals} more={copy.DETAILS_LABEL} onMore={() => onTab("goals")}>
      <ul className="flex flex-col gap-3">
        {model.goals.map((g) => {
          const tone = TONE[g.tone];
          return (
            <li key={g.goalId} className="flex flex-col gap-2">
              <span className="flex items-start gap-2 text-body">
                <tone.icon className={cn("mt-0.5 size-5 shrink-0", tone.className)} aria-hidden />
                <span className={cn("flex-1", g.tone === "gap" && "font-semibold")}>{g.line}</span>
                {!g.lever && <HelpChip chip={chips.goals[g.goalId]?.[0]} className="-my-1" />}
              </span>
              {g.lever && <LeverButton label={g.lever.label} chip={chips.goals[g.goalId]?.[0]} question={g.lever.askSprout} />}
            </li>
          );
        })}
      </ul>
    </Block>
  );
}

// 5. Your path: Now / Next / Later, one product each; a row opens that product in the Roadmap tab.
function Path({
  model,
  chips,
  onTab,
  onProduct,
}: {
  model: OverviewModel;
  chips: BlockChips;
  onTab: (tab: Tab) => void;
  onProduct: (productId: string) => void;
}) {
  if (model.path.length === 0) return null;
  return (
    <Block id="your-path" title={copy.BLOCK_TITLES.path} more={copy.OPEN_ROADMAP_LABEL} onMore={() => onTab("roadmap")}>
      <ol className="-mx-2 flex flex-col">
        {model.path.map((p) => {
          const meta = stageMeta(p.stage as Stage);
          return (
            <li key={p.stage} className="flex items-start gap-1">
              <button
                type="button"
                onClick={() => p.productId && onProduct(p.productId)}
                className="flex min-w-0 flex-1 items-start gap-3 rounded-xl px-2 py-2 text-left outline-none transition-colors hover:bg-brand-50 focus-visible:ring-4 focus-visible:ring-ring/30"
              >
                <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", meta.dot)} aria-hidden>
                  <meta.icon className="size-5" />
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="text-body font-semibold">
                    <span className={cn("mr-2 text-caption font-semibold tracking-wide uppercase", meta.text)}>{copy.PATH_STAGE_LABELS[p.stage]}</span>
                    {p.title}
                  </span>
                  <span className="text-small text-muted-foreground">{p.detail}</span>
                  {p.unlock && <span className="text-small font-medium text-warning">{p.unlock}</span>}
                </span>
              </button>
              <HelpChip chip={chips.path[p.stage]?.[0]} className="mt-2" />
            </li>
          );
        })}
      </ol>
    </Block>
  );
}

// The Overview (docs/DASHBOARD.md): six blocks in order, every string and number from buildOverview().
export function Overview({
  model,
  personaId,
  stepKind,
  bankerSummary,
  stepOneDone,
  onStepOneDone,
  onTab,
  onProduct,
  actions,
  share,
}: {
  model: OverviewModel;
  personaId: PersonaId;
  stepKind: StepKind;
  bankerSummary: string;
  stepOneDone: boolean;
  onStepOneDone: () => void;
  onTab: (tab: Tab) => void;
  onProduct: (productId: string) => void;
  actions: ReactNode;
  share?: ReactNode;
}) {
  const chips = useAskSprout().blockChips();
  return (
    <div className="flex flex-col gap-6">
      <NextMove model={model} chips={chips} personaId={personaId} stepKind={stepKind} done={stepOneDone} onDone={onStepOneDone} onProduct={onProduct} />
      <div className="grid gap-6 md:grid-cols-2">
        <Month model={model} chips={chips} onTab={onTab} />
        <Cushion model={model} chips={chips} onTab={onTab} />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Goals model={model} chips={chips} onTab={onTab} />
        <Path model={model} chips={chips} onTab={onTab} onProduct={onProduct} />
      </div>
      <section aria-label={copy.BLOCK_TITLES.fnb} className="grid items-start gap-6 md:grid-cols-2">
        <BankerCta summary={bankerSummary} title={copy.BLOCK_TITLES.fnb}>
          {actions}
        </BankerCta>
        {share}
      </section>
    </div>
  );
}
