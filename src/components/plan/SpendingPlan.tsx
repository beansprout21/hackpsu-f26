import { ShieldCheck, Sparkles } from "lucide-react";
import { AskChip } from "@/components/chat/AskSprout";
import { ASK_SPROUT_STARTERS } from "@/lib/client/planCopy";
import { cn } from "@/lib/utils";
import type { Plan, SpendingBucket } from "@/types";
import { BUCKETS, formatMonths, usd } from "./format";

export function SpendingPlan({ plan }: { plan: Plan }) {
  const costs = plan.effectiveMonthlyIncome - plan.monthlySurplus;
  const cushionBucket = plan.spendingPlan.find((b) => b.bucket === "emergency_fund");
  const { futureYou } = plan;

  return (
    <section
      aria-labelledby="spending"
      className="flex flex-col gap-6 rounded-2xl bg-card p-6 shadow-card xl:grid xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] xl:gap-x-10"
    >
      <div className="flex flex-col gap-1 xl:col-start-1">
        <h2 id="spending" className="text-small font-semibold tracking-wide text-muted-foreground uppercase">
          Your spending plan
        </h2>
        <p className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-title font-semibold text-brand-700 tabular-nums">
            {usd(Math.max(plan.monthlySurplus, 0))}
          </span>
          <span className="text-body text-muted-foreground">a month to work with</span>
        </p>
        <p className="text-small text-muted-foreground tabular-nums">
          {usd(plan.effectiveMonthlyIncome)} comes in − {usd(costs)} in costs
        </p>
      </div>

      <div className="xl:col-start-1">
        <SpendingBar buckets={plan.spendingPlan} />
      </div>

      <ul className="grid gap-4 sm:grid-cols-2 xl:col-start-1">
        {plan.spendingPlan.map((b) => (
          <li key={b.bucket} className="flex gap-3">
            <span className={cn("mt-2 size-2 shrink-0 rounded-full", BUCKETS[b.bucket].color)} aria-hidden />
            <span className="flex flex-col">
              <span className="text-body font-semibold tabular-nums">
                {BUCKETS[b.bucket].label} · {usd(b.monthlyAmount)}/mo{" "}
                <span className="text-small font-normal text-muted-foreground">({Math.round(b.percent)}%)</span>
              </span>
              <span className="text-small text-muted-foreground">{b.note}</span>
            </span>
          </li>
        ))}
      </ul>

      <div className="grid gap-4 sm:grid-cols-2 xl:col-start-2 xl:row-span-4 xl:row-start-1 xl:grid-cols-1 xl:self-start">
        <div className="flex gap-3 rounded-xl bg-brand-50 p-4">
          <ShieldCheck className="size-5 shrink-0 text-brand-600" aria-hidden />
          <p className="text-small">
            <span className="font-semibold">Your {usd(plan.cushionTarget)} safety cushion</span>{" "}
            {plan.cushionFillsInMonths !== null
              ? `fills in about ${formatMonths(plan.cushionFillsInMonths)}.`
              : cushionBucket && cushionBucket.monthlyAmount > 0
                ? "is already covered."
                : "starts once there's room in your budget."}
          </p>
        </div>
        <div className="flex gap-3 rounded-xl bg-brand-50 p-4">
          <Sparkles className="size-5 shrink-0 text-brand-600" aria-hidden />
          <p className="text-small">
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

      <div className="flex flex-wrap gap-2 xl:col-start-1">
        <AskChip question={ASK_SPROUT_STARTERS[1]} />
        <AskChip question="Why is my guilt-free money this amount?" />
      </div>
    </section>
  );
}

export function SpendingBar({ buckets }: { buckets: SpendingBucket[] }) {
  return (
    <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted" role="img" aria-label="Spending plan split">
      {buckets.map((b) => (
        <span key={b.bucket} className={cn("h-full", BUCKETS[b.bucket].color)} style={{ width: `${Math.max(b.percent, 0)}%` }} />
      ))}
    </div>
  );
}
