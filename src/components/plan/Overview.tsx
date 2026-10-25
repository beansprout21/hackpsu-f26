"use client";

import type { ReactNode } from "react";
import { ArrowRight, Check, CircleCheck, CircleHelp, ExternalLink, Hourglass, Sparkles, Sprout, TrendingUp, type LucideIcon } from "lucide-react";
import { useAskSprout } from "@/components/chat/AskSprout";
import type { BlockChips, Chip } from "@/lib/client/chatCopy";
import { PERSONA_ICONS } from "@/components/sprout/personaIcons";
import * as copy from "@/lib/client/planCopy";
import { cn } from "@/lib/utils";
import type { PersonaId } from "@/types";
import { BUCKETS, usd } from "./format";
import { GuideStepRow, productChip } from "./guide";
import { OVERVIEW_STEPS, V2_COPY, type OverviewModelV2 } from "./overviewV2";
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

// 1. Your step-by-step plan: persona chip, then up to 4 numbered steps (move, the FNB account that holds
// it, the next product, what unlocks later). Step 1 keeps Done and "Why this first?".
function StepGuide({
  model,
  chips,
  personaId,
  done,
  onDone,
  onTab,
  onProduct,
}: {
  model: OverviewModelV2;
  chips: BlockChips;
  personaId: PersonaId;
  done: boolean;
  onDone: () => void;
  onTab: (tab: Tab) => void;
  onProduct: (productId: string) => void;
}) {
  const PersonaIcon = PERSONA_ICONS[personaId];
  const steps = model.steps.slice(0, OVERVIEW_STEPS);
  return (
    <section aria-labelledby="step-guide" className="flex flex-col gap-4 rounded-2xl bg-card p-6 shadow-card ring-2 ring-success/30">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="step-guide" className="flex items-center gap-2 text-caption font-semibold tracking-wide text-success uppercase">
          <Sprout className="size-5" aria-hidden />
          {V2_COPY.guideTitle}
        </h2>
        <span className="flex flex-wrap items-center gap-2">
          <span
            title={model.persona.tagline}
            className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-3 py-1 text-caption font-semibold text-brand-700"
          >
            <PersonaIcon className="size-4 text-foreground" aria-hidden />
            {model.persona.label}
          </span>
          {model.steps.length > steps.length && (
            <button
              type="button"
              onClick={() => onTab("roadmap")}
              className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-small font-semibold text-brand-700 outline-none transition-colors hover:bg-brand-50 focus-visible:ring-4 focus-visible:ring-ring/30"
            >
              {copy.OPEN_ROADMAP_LABEL}
              <ArrowRight className="size-4" aria-hidden />
            </button>
          )}
        </span>
      </div>

      <ol className="flex flex-col">
        {steps.map((s, i) =>
          s.kind === "move" ? (
            <GuideStepRow key={s.n} step={s} last={i === steps.length - 1} chip={chips.nextMove[0]} onProduct={onProduct}>
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
              {model.nextMove.link && (
                <a
                  href={model.nextMove.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-small font-semibold text-info underline-offset-4 hover:underline focus-visible:ring-4 focus-visible:ring-info/30 focus-visible:outline-none"
                >
                  {copy.CREDIT_REPORT_LINK_LABEL}
                  <ExternalLink className="size-4" aria-hidden />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              )}
            </GuideStepRow>
          ) : (
            <GuideStepRow key={s.n} step={s} last={i === steps.length - 1} chip={productChip(chips, s.productId)} onProduct={onProduct} />
          ),
        )}
      </ol>
    </section>
  );
}

// 2. Your month: the v2 sentence and one 4-part bar (fixed costs / safety cushion / goals / guilt-free).
function Month({ model, chips, onTab }: { model: OverviewModelV2; chips: BlockChips; onTab: (tab: Tab) => void }) {
  const { bar } = model.month;
  const parts = [
    { key: "fixed", label: V2_COPY.barFixed, amount: bar.fixed, color: BUCKETS.fixed_costs.color },
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
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
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
function Cushion({ model, chips, onTab }: { model: OverviewModelV2; chips: BlockChips; onTab: (tab: Tab) => void }) {
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
const TONE: Record<OverviewModelV2["goals"][number]["tone"], { icon: LucideIcon; className: string }> = {
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

function Goals({ model, chips, onTab }: { model: OverviewModelV2; chips: BlockChips; onTab: (tab: Tab) => void }) {
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

// The Overview (docs/DASHBOARD.md v2): step-by-step plan, month, cushion, goals, take it to FNB.
export function Overview({
  model,
  personaId,
  bankerSummary,
  stepOneDone,
  onStepOneDone,
  onTab,
  onProduct,
  actions,
  share,
}: {
  model: OverviewModelV2;
  personaId: PersonaId;
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
      <StepGuide model={model} chips={chips} personaId={personaId} done={stepOneDone} onDone={onStepOneDone} onTab={onTab} onProduct={onProduct} />
      {/* v2: the 4-part month bar needs the full width; cushion and goals share the next row. */}
      <Month model={model} chips={chips} onTab={onTab} />
      <div className="grid items-start gap-6 md:grid-cols-2">
        <Cushion model={model} chips={chips} onTab={onTab} />
        <Goals model={model} chips={chips} onTab={onTab} />
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
