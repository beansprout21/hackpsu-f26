"use client";

// Live "show the math" readout. Uses the engine's own computeMath (pure, no server deps),
// so this number always matches the plan's effective income and surplus.
import type { FinancialSnapshot } from "@/types";
import { computeMath } from "@/lib/server/engine/math";
import { cn } from "@/lib/utils";
import { FREQUENCY_LABELS, INCOME_OPTIONS } from "./draft";

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const DIVISOR_NOTE = { monthly: "", per_semester: " ÷ 4", one_time: " ÷ 9" } as const;

// lineLabels: optional label per incomeSources entry (same order), e.g. "Birthday money and gifts".
export function SurplusReadout({ snapshot, lineLabels }: { snapshot: FinancialSnapshot; lineLabels?: string[] }) {
  const math = computeMath(snapshot);
  const costs = math.monthlyFixedCosts + math.monthlyDebtPayments;
  const room = math.monthlySurplus;
  const label = (kind: string, i: number) =>
    lineLabels?.[i] ?? (kind === "job" ? "Take-home pay" : (INCOME_OPTIONS.find((o) => o.kind === kind)?.label ?? kind));

  return (
    <div className="rounded-2xl border-2 border-primary/40 bg-secondary/60 p-4" aria-live="polite">
      <p className="text-lg font-semibold">
        {room > 0
          ? `You have about ${usd(room)}/month to work with`
          : room === 0
            ? "Your costs use up your income right now"
            : `Your costs run about ${usd(-room)}/month over your income`}
      </p>
      <ul className="mt-3 flex flex-col gap-1 text-sm text-muted-foreground">
        {math.incomeLines.map((line, i) => (
          <li key={i} className="flex justify-between gap-3">
            <span>
              {label(line.kind, i)}: {usd(line.amount)} {FREQUENCY_LABELS[line.frequency]}
              {DIVISOR_NOTE[line.frequency]}
            </span>
            <span className="tabular-nums text-foreground">{usd(line.monthlyEquivalent)}/mo</span>
          </li>
        ))}
        {math.incomeLines.length === 0 && <li>No income added yet. That&apos;s okay, lots of students start here.</li>}
        <li className="flex justify-between gap-3 border-t border-border pt-1">
          <span>Effective monthly income</span>
          <span className="tabular-nums text-foreground">{usd(math.effectiveMonthlyIncome)}/mo</span>
        </li>
        <li className="flex justify-between gap-3">
          <span>Fixed costs + debt payments</span>
          <span className="tabular-nums text-foreground">−{usd(costs)}/mo</span>
        </li>
        <li className={cn("flex justify-between gap-3 font-medium", room > 0 ? "text-foreground" : "text-destructive")}>
          <span>Left to plan with</span>
          <span className="tabular-nums">{room < 0 ? `−${usd(-room)}` : usd(room)}/mo</span>
        </li>
      </ul>
      {room <= 0 && (
        <p className="mt-2 text-sm text-muted-foreground">Sprout will start by finding your breathing room.</p>
      )}
    </div>
  );
}
