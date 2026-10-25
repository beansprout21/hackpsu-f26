"use client";

import { Check } from "lucide-react";
import { PERSONA_ICONS } from "@/components/sprout/personaIcons";
import { personaFromValues } from "@/data/personaTaxonomy";
import { cn } from "@/lib/utils";
import type { GoalId, LifeStage, ValueTag } from "@/types";
import { Chip } from "./GoalTimeline";
import { GOALS, LIFE_STAGES, VALUE_LABELS, WHY_CHIPS, formatHorizon, goalMeta } from "./copy";
import type { GoalDraft } from "./draft";

const RICH_LIFE_MAX = 500;
const WHY_TEXT_MAX = 120;

export function LifeStageStep({
  value,
  onPick,
}: {
  value?: LifeStage;
  onPick: (stage: LifeStage) => void;
}) {
  return (
    <div className="grid gap-3">
      {LIFE_STAGES.map((s) => (
        <button
          key={s.id}
          type="button"
          aria-pressed={value === s.id}
          onClick={() => onPick(s.id)}
          className={cn(
            "flex min-h-20 items-center justify-between gap-3 rounded-2xl border-2 px-5 py-4 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
            value === s.id ? "border-primary bg-secondary" : "border-border hover:border-primary/60 hover:bg-secondary/60",
          )}
        >
          <span className="flex flex-col">
            <span className="text-lg font-semibold">{s.label}</span>
            <span className="text-sm text-muted-foreground">{s.detail}</span>
          </span>
          {value === s.id && <Check className="size-5 shrink-0 text-primary" aria-hidden />}
        </button>
      ))}
    </div>
  );
}

const article = (label: string) => (/^[AEIOU]/i.test(label) ? "an" : "a");
const withArticle = (label: string) => `${article(label)} ${label}`;

export function PersonaReveal({ values }: { values: ValueTag[] }) {
  const persona = personaFromValues(values);
  const Icon = PERSONA_ICONS[persona.id];
  return (
    // Desktop: a tall, narrow "profile card" rather than a wide banner.
    <div className="animate-in fade-in zoom-in-95 flex flex-col items-center gap-4 rounded-2xl border border-border bg-secondary px-6 py-8 text-center duration-500 lg:w-full lg:max-w-md lg:gap-5 lg:py-12">
      <span className="flex size-20 items-center justify-center rounded-full bg-brand-200 text-foreground shadow-sm ring-2 ring-white lg:size-24">
        <Icon className="size-8 lg:size-10" aria-hidden />
      </span>
      <p className="text-sm font-semibold tracking-wide text-highlight uppercase">You&apos;re {article(persona.label)}</p>
      <h2 className="-mt-3 text-3xl font-semibold tracking-tight">{persona.label}</h2>
      <p className="max-w-md text-muted-foreground">{persona.tagline}</p>
      <ul className="flex flex-wrap justify-center gap-2 lg:flex-col lg:items-center" aria-label="Your top values">
        {values.map((v) => (
          <li key={v} className="rounded-full bg-background px-3 py-1 text-sm font-medium">
            {VALUE_LABELS[v]}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function GoalsStep({
  selected,
  onToggle,
}: {
  selected: GoalId[];
  onToggle: (id: GoalId) => void;
}) {
  const full = selected.length >= 3;
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
        {GOALS.map(({ id, label, icon: Icon }) => {
          const on = selected.includes(id);
          return (
            <button
              key={id}
              type="button"
              aria-pressed={on}
              disabled={!on && full}
              onClick={() => onToggle(id)}
              className={cn(
                "flex min-h-24 flex-col items-start justify-between gap-2 rounded-2xl border-2 p-4 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-40",
                on ? "border-primary bg-secondary" : "border-border hover:border-primary/60 hover:bg-secondary/60",
              )}
            >
              <span className="flex w-full items-center justify-between">
                <Icon className="size-6 text-highlight" aria-hidden />
                {on && <Check className="size-5 text-primary" aria-hidden />}
              </span>
              <span className="font-semibold leading-snug">{label}</span>
            </button>
          );
        })}
      </div>
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {selected.length} of 3 picked{full && ". Unpick one to swap it."}
      </p>
    </div>
  );
}

export function WhyStep({
  goals,
  onChange,
}: {
  goals: GoalDraft[];
  onChange: (goals: GoalDraft[]) => void;
}) {
  const patch = (i: number, p: Partial<GoalDraft>) =>
    onChange(goals.map((g, j) => (j === i ? { ...g, ...p } : g)));
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {goals.map((g, i) => {
        const meta = goalMeta(g.id);
        return (
          <fieldset key={g.id} className="flex flex-col gap-3 rounded-2xl border border-border p-4">
            <legend className="sr-only">Why {meta.label}</legend>
            <span className="flex items-center gap-2 font-semibold">
              <meta.icon className="size-5 text-highlight" aria-hidden />
              {meta.label}
              <span className="font-normal text-muted-foreground">· in {formatHorizon(g.horizonMonths)}</span>
            </span>
            <div className="flex flex-wrap gap-2">
              {WHY_CHIPS[g.id].map((chip) => (
                <Chip
                  key={chip}
                  selected={g.whyChip === chip}
                  onClick={() => patch(i, { whyChip: g.whyChip === chip ? undefined : chip })}
                >
                  {chip}
                </Chip>
              ))}
            </div>
            <input
              value={g.whyText}
              maxLength={WHY_TEXT_MAX}
              onChange={(e) => patch(i, { whyText: e.target.value })}
              placeholder="Or say it in your own words"
              aria-label={`Your own reason for ${meta.label}`}
              className="h-10 rounded-lg border border-input bg-transparent px-3 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
            />
          </fieldset>
        );
      })}
    </div>
  );
}

export function RichLifeStep({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="font-semibold">Describe your rich life in one sentence</span>
      <textarea
        value={value}
        maxLength={RICH_LIFE_MAX}
        rows={3}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Living in Tokyo for a semester without checking my balance every day."
        className="resize-none rounded-xl border border-input bg-transparent p-3 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      />
      <span className="self-end text-xs text-muted-foreground tabular-nums">
        {value.length}/{RICH_LIFE_MAX}
      </span>
    </label>
  );
}

export function FinishSummary({ values, goals }: { values: ValueTag[]; goals: GoalDraft[] }) {
  const persona = personaFromValues(values);
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border p-4">
      <p className="text-sm text-muted-foreground">
        You&apos;re {withArticle(persona.label)}, working toward:
      </p>
      <ol className="flex flex-col gap-2">
        {goals.map((g, i) => {
          const meta = goalMeta(g.id);
          return (
            <li key={g.id} className="flex items-center gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-highlight text-xs font-semibold text-highlight-foreground">
                {i + 1}
              </span>
              <span className="font-medium">{meta.label}</span>
              <span className="text-sm text-muted-foreground">in {formatHorizon(g.horizonMonths)}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
