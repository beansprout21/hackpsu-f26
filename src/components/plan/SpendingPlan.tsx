import { ShieldCheck, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Plan } from "@/types";
import { BUCKETS, formatMonths, usd } from "./format";

export function SpendingPlan({ plan }: { plan: Plan }) {
  const costs = plan.effectiveMonthlyIncome - plan.monthlySurplus;
  const cushionBucket = plan.spendingPlan.find((b) => b.bucket === "emergency_fund");
  const { futureYou } = plan;

  return (
    <section aria-labelledby="spending" className="flex flex-col gap-5 rounded-2xl border border-border p-5">
      <div className="flex flex-col gap-1">
        <h2 id="spending" className="text-lg font-semibold tracking-tight">
          Your spending plan
        </h2>
        <p className="text-sm text-muted-foreground tabular-nums">
          {usd(plan.effectiveMonthlyIncome)} comes in each month − {usd(costs)} in costs ={" "}
          <span className="font-semibold text-foreground">{usd(plan.monthlySurplus)} to work with</span>
        </p>
      </div>

      <div className="flex h-4 w-full overflow-hidden rounded-full bg-muted" role="img" aria-label="Spending plan split">
        {plan.spendingPlan.map((b) => (
          <span
            key={b.bucket}
            className={cn("h-full", BUCKETS[b.bucket].color)}
            style={{ width: `${Math.max(b.percent, 0)}%` }}
          />
        ))}
      </div>

      <ul className="grid gap-3 sm:grid-cols-2">
        {plan.spendingPlan.map((b) => (
          <li key={b.bucket} className="flex gap-3">
            <span className={cn("mt-1.5 size-3 shrink-0 rounded-full", BUCKETS[b.bucket].color)} aria-hidden />
            <span className="flex flex-col gap-0.5">
              <span className="font-medium tabular-nums">
                {BUCKETS[b.bucket].label} · {usd(b.monthlyAmount)}/mo{" "}
                <span className="text-sm font-normal text-muted-foreground">({Math.round(b.percent)}%)</span>
              </span>
              <span className="text-sm text-muted-foreground">{b.note}</span>
            </span>
          </li>
        ))}
      </ul>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex gap-3 rounded-xl bg-secondary p-4">
          <ShieldCheck className="size-5 shrink-0 text-primary" aria-hidden />
          <p className="text-sm leading-relaxed">
            <span className="font-semibold">Your {usd(plan.cushionTarget)} cushion</span>{" "}
            {plan.cushionFillsInMonths !== null
              ? `fills in about ${formatMonths(plan.cushionFillsInMonths)}.`
              : cushionBucket && cushionBucket.monthlyAmount > 0
                ? "is already covered."
                : "starts once there's room in your budget."}
          </p>
        </div>
        <div className="flex gap-3 rounded-xl bg-secondary p-4">
          <Sparkles className="size-5 shrink-0 text-primary" aria-hidden />
          <p className="text-sm leading-relaxed">
            <span className="font-semibold">Future You: </span>
            {futureYou.earmarkMonthly !== null
              ? `about ${usd(futureYou.earmarkMonthly)}/month for the long term. `
              : futureYou.unlockCondition
                ? `${futureYou.unlockCondition}. `
                : ""}
            {futureYou.handoff}
          </p>
        </div>
      </div>
    </section>
  );
}
