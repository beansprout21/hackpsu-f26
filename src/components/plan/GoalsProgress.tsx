"use client";

import { useState } from "react";
import { Check, CircleCheck, TrendingUp } from "lucide-react";
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
    <li className="flex flex-col gap-4 rounded-2xl bg-card p-6 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-body font-semibold">
          <meta.icon className="size-6 text-brand-600" aria-hidden />
          {meta.label}
        </span>
        <span
          className={cn(
            "flex items-center gap-1 rounded-full px-3 py-1 text-caption font-semibold",
            a.onTrack ? "bg-success-soft text-success" : "bg-warning-soft text-warning",
          )}
        >
          {a.onTrack ? <CircleCheck className="size-4" aria-hidden /> : <TrendingUp className="size-4" aria-hidden />}
          {a.onTrack ? "On track" : "Needs a boost"}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <span
            className={cn("block h-full rounded-full", a.onTrack ? "bg-success" : "bg-brand-400")}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-small text-muted-foreground tabular-nums">
          {usd(a.monthlyAmount)}/mo of the {usd(a.requiredMonthly)}/mo it needs
          {a.monthlyAmount > 0 ? ` · at this pace, ${formatMonths(a.monthsToTarget)}` : " · starts after your cushion"}
        </p>
      </div>

      {!a.onTrack && levers.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-caption font-semibold tracking-wide text-muted-foreground uppercase">
            Ways to close the gap
          </span>
          <div className="flex flex-wrap gap-2">
            {levers.map((l, i) => (
              <button
                key={i}
                type="button"
                aria-pressed={picked === i}
                onClick={() => setPicked(picked === i ? null : i)}
                className={cn(
                  "inline-flex min-h-9 items-center gap-1 rounded-full border-2 px-3 py-1 text-left text-small transition-colors duration-150 outline-none focus-visible:ring-4 focus-visible:ring-ring/40 active:translate-y-px",
                  picked === i
                    ? "border-brand-600 bg-brand-100 font-semibold text-brand-700"
                    : "border-border bg-card hover:border-brand-400 hover:bg-brand-50",
                )}
              >
                {picked === i && <Check className="size-4" aria-hidden />}
                {l.label}
              </button>
            ))}
          </div>
          {picked !== null && (
            <p
              className="animate-in fade-in slide-in-from-top-1 rounded-xl bg-brand-50 px-4 py-3 text-small duration-200 motion-reduce:animate-none"
              aria-live="polite"
            >
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
    <section aria-labelledby="goals" className="flex flex-col gap-4">
      <h2 id="goals" className="text-lead font-semibold">
        Your goals
      </h2>
      <ul className="flex flex-col gap-4">
        {allocation.map((a) => (
          <GoalRow key={a.goalId} a={a} />
        ))}
      </ul>
    </section>
  );
}
