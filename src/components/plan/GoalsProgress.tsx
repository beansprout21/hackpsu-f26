"use client";

import { useState } from "react";
import { CircleCheck, TrendingUp } from "lucide-react";
import { goalMeta } from "@/components/intake/copy";
import { cn } from "@/lib/utils";
import type { Allocation, GapLever } from "@/types";
import { formatMonths, usd } from "./format";

function leverCopy(lever: GapLever, a: Allocation, goalLabel: string) {
  switch (lever.kind) {
    case "turn_up_dial":
      return {
        label: `Move ${usd(lever.moveFromGuiltFree)} of guilt-free money here`,
        detail: `${goalLabel} gets ${usd(a.requiredMonthly)} a month and stays on schedule. Your guilt-free spending goes down by ${usd(lever.moveFromGuiltFree)} a month.`,
      };
    case "more_time":
      return {
        label: `Give it ${formatMonths(lever.newHorizonMonths)}`,
        detail: `Keep ${usd(a.monthlyAmount)} a month and reach it in ${formatMonths(lever.newHorizonMonths)} instead. Nothing else changes.`,
      };
    case "smaller_target":
      return {
        label: `Aim for ${usd(lever.reachableAmount)} first`,
        detail: `Reach ${usd(lever.reachableAmount)} on your original timeline, then keep building from there.`,
      };
  }
}

function GoalRow({ a }: { a: Allocation }) {
  const [picked, setPicked] = useState<number | null>(null);
  const meta = goalMeta(a.goalId);
  const pct = a.requiredMonthly > 0 ? Math.min((a.monthlyAmount / a.requiredMonthly) * 100, 100) : 100;
  const levers = a.levers.map((l) => leverCopy(l, a, meta.label));

  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2 font-semibold">
          <meta.icon className="size-5 text-highlight" aria-hidden />
          {meta.label}
        </span>
        <span
          className={cn(
            "flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
            a.onTrack ? "bg-primary/20 text-foreground" : "bg-secondary text-highlight",
          )}
        >
          {a.onTrack ? <CircleCheck className="size-3.5" aria-hidden /> : <TrendingUp className="size-3.5" aria-hidden />}
          {a.onTrack ? "On track" : "Needs a boost"}
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="h-2.5 overflow-hidden rounded-full bg-muted">
          <span className="block h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-sm text-muted-foreground tabular-nums">
          {usd(a.monthlyAmount)}/mo of the {usd(a.requiredMonthly)}/mo it needs
          {a.monthlyAmount > 0 ? ` · at this pace, ${formatMonths(a.monthsToTarget)}` : " · starts after your cushion"}
        </p>
      </div>

      {!a.onTrack && levers.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Ways to close the gap</span>
          <div className="flex flex-wrap gap-2">
            {levers.map((l, i) => (
              <button
                key={i}
                type="button"
                aria-pressed={picked === i}
                onClick={() => setPicked(picked === i ? null : i)}
                className={cn(
                  "min-h-9 rounded-full border px-3 py-1.5 text-left text-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  picked === i
                    ? "border-primary bg-primary font-medium text-primary-foreground"
                    : "border-border hover:border-primary/60 hover:bg-secondary",
                )}
              >
                {l.label}
              </button>
            ))}
          </div>
          {picked !== null && (
            <p className="animate-in fade-in rounded-xl bg-secondary px-3 py-2 text-sm leading-relaxed" aria-live="polite">
              {levers[picked].detail}
            </p>
          )}
        </div>
      )}
    </li>
  );
}

export function GoalsProgress({ allocation }: { allocation: Allocation[] }) {
  if (allocation.length === 0) return null;
  return (
    <section aria-labelledby="goals" className="flex flex-col gap-3">
      <h2 id="goals" className="text-lg font-semibold tracking-tight">
        Your goals
      </h2>
      <ul className="flex flex-col gap-3">
        {allocation.map((a) => (
          <GoalRow key={a.goalId} a={a} />
        ))}
      </ul>
    </section>
  );
}
