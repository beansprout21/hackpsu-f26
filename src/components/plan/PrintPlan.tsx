"use client";

// "Save for my banker" (#52): a print-only version of the plan. Hidden on screen; window.print()
// shows it instead of the page (browser "Save as PDF"). Nothing is stored.
import type { ReactNode } from "react";
import { useUser } from "@auth0/nextjs-auth0/client";
import { goalMeta } from "@/components/intake/copy";
import type { Allocation, GapLever, GoalProfile, Plan, Stage } from "@/types";
import { BUCKETS, formatMonths, productById, productName, usd, whenLabel } from "./format";

// Hides every top-level page block (header, footer, toaster) that does not contain this plan.
const HIDE_PAGE_CHROME = "print:[body>*:not(:has(&))]:hidden";

const STAGES: { id: Stage; label: string }[] = [
  { id: "now", label: "Now" },
  { id: "next", label: "Next" },
  { id: "later", label: "Later" },
];

function leverText(lever: GapLever, a: Allocation) {
  switch (lever.kind) {
    case "turn_up_dial":
      return `Move ${usd(lever.moveFromGuiltFree)}/mo from guilt-free spending to reach ${usd(a.requiredMonthly)}/mo and stay on schedule.`;
    case "more_time":
      return `Keep ${usd(a.monthlyAmount)}/mo and give it ${formatMonths(lever.newHorizonMonths)}.`;
    case "smaller_target":
      return `Aim for ${usd(lever.reachableAmount)} first on the original timeline.`;
  }
}

// The engine puts the fee line first in termsToKnow (fit-first, fee-transparent); other first terms are not fees.
const feeLine = (terms: string[]) => (terms[0] && /fee|free|charge|penalt|waiv|no cost/i.test(terms[0]) ? terms[0] : null);

const noDot = (s: string) => s.replace(/[.\s]+$/, "");

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-1.5">
      <h2 className="border-b border-black pb-0.5 text-[11pt] font-bold break-after-avoid">{title}</h2>
      {children}
    </section>
  );
}

export function PrintPlan({ plan, profile }: { plan: Plan; profile: GoalProfile }) {
  const { user } = useUser();
  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const costs = plan.effectiveMonthlyIncome - plan.monthlySurplus;
  const steps = plan.steps.filter((s) => !(s.order === plan.stepOne.order && s.title === plan.stepOne.title));
  const { futureYou } = plan;

  return (
    <div
      data-print-plan
      className={`hidden flex-col gap-4 bg-white text-[9.5pt] leading-snug text-black print:flex ${HIDE_PAGE_CHROME}`}
    >
      <header className="flex items-end justify-between gap-4 border-b-2 border-black pb-2">
        <div>
          <h1 className="text-[16pt] font-bold">{user?.name ? `Sprout plan for ${user.name}` : "Sprout plan"}</h1>
          <p>{plan.headline}</p>
        </div>
        <div className="shrink-0 text-right">
          <p>{today}</p>
          <p>Prototype built for FNB</p>
        </div>
      </header>

      <Section title="Step one: this week">
        <p className="font-semibold">{plan.stepOne.title}</p>
        <p>{plan.stepOne.detail}</p>
      </Section>

      <Section title={`Who you are: ${profile.persona.label}`}>
        <p>{profile.persona.description}</p>
        <p className="italic">&ldquo;{profile.richLifeStatement}&rdquo;</p>
      </Section>

      <Section title="Spending plan">
        <p className="tabular-nums">
          {usd(plan.effectiveMonthlyIncome)} comes in each month − {usd(costs)} in costs ={" "}
          <strong>{usd(plan.monthlySurplus)} to work with</strong>
        </p>
        <table className="w-full border-collapse tabular-nums">
          <tbody>
            {plan.spendingPlan.map((b) => (
              <tr key={b.bucket} className="border-b border-neutral-300 align-top">
                <td className="py-0.5 pr-3 font-semibold whitespace-nowrap">{BUCKETS[b.bucket].label}</td>
                <td className="py-0.5 pr-3 text-right whitespace-nowrap">{usd(b.monthlyAmount)}/mo</td>
                <td className="py-0.5 pr-3 text-right whitespace-nowrap">{Math.round(b.percent)}%</td>
                <td className="py-0.5">{b.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>
          <strong>Cushion:</strong> {usd(plan.cushionTarget)}
          {plan.cushionFillsInMonths !== null ? `, fills in about ${formatMonths(plan.cushionFillsInMonths)}.` : "."}{" "}
          <strong>Future You:</strong>{" "}
          {futureYou.earmarkMonthly !== null
            ? `about ${usd(futureYou.earmarkMonthly)}/month for the long term. `
            : futureYou.unlockCondition
              ? `${futureYou.unlockCondition}. `
              : ""}
          {futureYou.handoff}
        </p>
      </Section>

      {plan.allocation.length > 0 && (
        <Section title="Goals">
          <ul className="flex flex-col gap-1">
            {plan.allocation.map((a) => (
              <li key={a.goalId} className="break-inside-avoid tabular-nums">
                <strong>{goalMeta(a.goalId).label}</strong> ({a.onTrack ? "on track" : "needs a boost"}):{" "}
                {usd(a.monthlyAmount)}/mo allocated of {usd(a.requiredMonthly)}/mo required
                {a.monthlyAmount > 0 ? `; at this pace, ${formatMonths(a.monthsToTarget)}.` : "; starts after the cushion."}
                {!a.onTrack && a.levers[0] && <> Top lever: {leverText(a.levers[0], a)}</>}
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Timeline and matched FNB products">
        {STAGES.map((s) => {
          const stageSteps = steps.filter((x) => x.stage === s.id);
          const stageMatches = plan.matches.filter((m) => m.stage === s.id);
          if (stageSteps.length === 0 && stageMatches.length === 0) return null;
          return (
            <div key={s.id} className="flex flex-col gap-0.5">
              <h3 className="font-semibold break-after-avoid">{s.label}</h3>
              <ul className="flex list-disc flex-col gap-0.5 pl-5">
                {stageSteps.map((x) => (
                  <li key={x.order} className="break-inside-avoid">
                    {x.title} ({whenLabel(x.startMonth)}): {x.detail}
                  </li>
                ))}
                {stageMatches.map((m) => {
                  const fee = feeLine(m.termsToKnow);
                  const rate = productById(m.productId)?.rateNote;
                  return (
                    <li key={`${m.productId}-${m.goalId}`} className="break-inside-avoid">
                      <strong>{productName(m.productId)}</strong> (for {goalMeta(m.goalId).label})
                      {m.unlockCondition ? `. Unlocks: ${noDot(m.unlockCondition)}` : ""}
                      {fee ? `. Fees: ${noDot(fee)}` : ""}
                      {rate ? `. Rate: ${noDot(rate)}` : ""}.
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </Section>

      {plan.notYet.length > 0 && (
        <Section title="Not yet, on purpose">
          <ul className="list-disc pl-5">
            {plan.notYet.map((n, i) => (
              <li key={i}>
                <strong>
                  {n.productId ? productName(n.productId) : n.goalId ? goalMeta(n.goalId).label : "Holding off"}:
                </strong>{" "}
                {n.reason} Revisit {noDot(n.revisitWhen)}.
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="For your FNB banker">
        <p>{plan.bankerSummary}</p>
      </Section>

      <p className="border-t border-black pt-1.5 text-[8.5pt]">{plan.disclaimer}</p>
    </div>
  );
}
