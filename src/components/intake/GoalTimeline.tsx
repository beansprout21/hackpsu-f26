"use client";

import { ChevronDown, ChevronUp, Sprout } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { estimateTarget } from "@/lib/server/engine/defaults";
import { cn } from "@/lib/utils";
import { formatHorizon, formatUsd, goalMeta } from "./copy";
import type { GoalDraft } from "./draft";
import { TimelineTrack } from "./TimelineTrack";

const COST_MAX = 15000;
const COST_STEP = 250;

export function GoalTimeline({
  goals,
  onChange,
}: {
  goals: GoalDraft[];
  onChange: (goals: GoalDraft[]) => void;
}) {
  const patch = (i: number, p: Partial<GoalDraft>) =>
    onChange(goals.map((g, j) => (j === i ? { ...g, ...p } : g)));
  const move = (i: number, by: -1 | 1) => {
    const next = [...goals];
    [next[i], next[i + by]] = [next[i + by], next[i]];
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-5">
      <TimelineTrack
        goals={goals}
        onMove={(id, horizonMonths) => patch(goals.findIndex((g) => g.id === id), { horizonMonths })}
      />

      <ol className="flex flex-col gap-3">
        {goals.map((g, i) => {
          const meta = goalMeta(g.id);
          const estimate = estimateTarget(g.id);
          const isEstimate = g.targetAmount === undefined;
          const amount = g.targetAmount ?? estimate;
          return (
            <li key={g.id} className="flex flex-col gap-4 rounded-2xl border border-border p-4">
              <div className="flex items-center gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-highlight text-xs font-semibold text-highlight-foreground">
                  {i + 1}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="font-semibold">{meta.label}</span>
                  <span className="text-sm text-muted-foreground">In {formatHorizon(g.horizonMonths)}</span>
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-9"
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                    aria-label={`Move ${meta.label} up`}
                  >
                    <ChevronUp />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-9"
                    disabled={i === goals.length - 1}
                    onClick={() => move(i, 1)}
                    aria-label={`Move ${meta.label} down`}
                  >
                    <ChevronDown />
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm text-muted-foreground">Roughly how much?</span>
                  <span className="text-lg font-semibold tabular-nums">
                    {formatUsd(amount)}
                    {amount >= COST_MAX && "+"}
                  </span>
                </div>
                <Slider
                  min={0}
                  max={COST_MAX}
                  step={COST_STEP}
                  value={[Math.min(amount, COST_MAX)]}
                  onValueChange={(v) => patch(i, { targetAmount: Array.isArray(v) ? v[0] : v })}
                  aria-label={`Rough cost for ${meta.label}`}
                  className="py-2"
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>$0</span>
                  {isEstimate ? (
                    <span className="flex items-center gap-1 font-medium text-highlight">
                      <Sprout className="size-3.5" aria-hidden />
                      Sprout&apos;s estimate
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => patch(i, { targetAmount: undefined })}
                      className="flex items-center gap-1 rounded font-medium text-highlight underline-offset-2 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                    >
                      <Sprout className="size-3.5" aria-hidden />
                      Use Sprout&apos;s estimate ({formatUsd(estimate)})
                    </button>
                  )}
                  <span>{formatUsd(COST_MAX)}+</span>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "min-h-9 rounded-full border px-3 py-1.5 text-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        selected
          ? "border-primary bg-primary font-medium text-primary-foreground"
          : "border-border bg-background hover:border-primary/60 hover:bg-secondary",
      )}
    >
      {children}
    </button>
  );
}
