// /banker/[id] detail (#54): what a banker reads before the meeting. Server component; read-only.
// Order: contact + dates, banker summary, goals + timeline, Step one, spending math, products, not yet, snapshot.
import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";
import { goalMeta, LIFE_STAGES } from "@/components/intake/copy";
import { BUCKETS, formatMonths, productById, productName, usd, whenLabel } from "@/components/plan/format";
import { getSharedPlan } from "@/lib/server/share";
import type { SharedPlan, Stage } from "@/types";
import { bankerAccess } from "./access";
import { BankerNotice } from "./Notice";
import { feeLine, FREQUENCY, INCOME_KIND, shortDate } from "./format";
import { PrintButton } from "./PrintButton";

// Hides every top-level page block (header, footer) that does not contain this detail when printing.
const HIDE_PAGE_CHROME = "print:[body>*:not(:has(&))]:hidden";

const STAGES: { id: Stage; label: string }[] = [
  { id: "now", label: "Now" },
  { id: "next", label: "Next" },
  { id: "later", label: "Later" },
];

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-card p-6 shadow-card print:break-inside-avoid print:p-0 print:shadow-none">
      <h2 className="text-lead font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap justify-between gap-x-4 border-b border-border py-1.5 text-small last:border-b-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium tabular-nums">{children}</dd>
    </div>
  );
}

export async function BankerPlanDetail({ params }: { params: Promise<{ id: string }> }) {
  const access = await bankerAccess();
  if (access.kind !== "ok") return <BankerNotice kind={access.kind} />;
  const { id } = await params;
  let shared: SharedPlan | null;
  try {
    shared = await getSharedPlan(access.redis, id);
  } catch {
    return <BankerNotice kind="unavailable" />;
  }
  if (!shared) {
    return (
      <section className="flex flex-col items-start gap-3 rounded-2xl bg-card p-6 shadow-card">
        <h2 className="text-lead font-semibold">Not found</h2>
        <p className="text-small text-muted-foreground">This plan is no longer shared. It may have expired or the customer stopped sharing.</p>
        <Link href="/banker" className="text-small font-semibold text-primary underline-offset-4 hover:underline">
          Back to shared plans
        </Link>
      </section>
    );
  }

  const { contact, plan, profile, snapshot, intake } = shared;
  const goalById = new Map(profile.goals.map((g) => [g.id, g]));
  const steps = plan.steps.filter((s) => !(s.order === plan.stepOne.order && s.title === plan.stepOne.title));
  const costs = plan.effectiveMonthlyIncome - plan.monthlySurplus;

  return (
    <div className={`flex flex-col gap-6 ${HIDE_PAGE_CHROME}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/banker" className="inline-flex items-center gap-1 text-small font-semibold text-primary underline-offset-4 hover:underline">
          <ArrowLeft className="size-4" aria-hidden /> All shared plans
        </Link>
        <PrintButton />
      </div>

      <header className="flex flex-col gap-2 rounded-2xl bg-card p-6 shadow-card print:p-0 print:shadow-none">
        <h1 className="text-title font-semibold">{contact.name || "Unnamed customer"}</h1>
        {contact.email && (
          <a href={`mailto:${contact.email}`} className="inline-flex items-center gap-1.5 self-start text-small text-primary underline-offset-4 hover:underline">
            <Mail className="size-4" aria-hidden /> {contact.email}
          </a>
        )}
        <p className="text-small text-muted-foreground">
          Shared {shortDate(shared.sharedAt)} · Kept until {shortDate(shared.expiresAt)} · Consent {shared.consentVersion}
        </p>
        <p className="text-small">
          <span className="font-semibold">{profile.persona.label}</span> ·{" "}
          {LIFE_STAGES.find((s) => s.id === intake.lifeStage)?.label ?? intake.lifeStage} ·{" "}
          {snapshot.isFnbCustomer ? "FNB customer" : "Not yet an FNB customer"}
        </p>
        <p className="text-small text-muted-foreground italic">&ldquo;{profile.richLifeStatement}&rdquo;</p>
      </header>

      <Card title="Banker summary">
        <p className="text-body leading-relaxed">{plan.bankerSummary}</p>
      </Card>

      <Card title="Goals">
        <ul className="flex flex-col gap-3">
          {plan.allocation.map((a) => {
            const g = goalById.get(a.goalId);
            return (
              <li key={a.goalId} className="flex flex-col gap-0.5 text-small">
                <span className="font-semibold">
                  {goalMeta(a.goalId).label}
                  {g && ` · priority ${g.priority} · ${usd(g.targetAmount)}${g.targetIsEstimate ? " (estimate)" : ""} in ${formatMonths(g.horizonMonths)}`}
                </span>
                <span className="tabular-nums">
                  {usd(a.monthlyAmount)}/mo allocated of {usd(a.requiredMonthly)}/mo required ·{" "}
                  {a.onTrack ? "on track" : "needs a boost"}
                  {a.monthlyAmount > 0 ? ` · at this pace, ${formatMonths(a.monthsToTarget)}` : ""}
                </span>
                {g?.motivation && <span className="text-muted-foreground">{g.motivation}</span>}
              </li>
            );
          })}
        </ul>
      </Card>

      <Card title="Timeline">
        {STAGES.map((s) => {
          const stageSteps = steps.filter((x) => x.stage === s.id);
          if (stageSteps.length === 0) return null;
          return (
            <div key={s.id} className="flex flex-col gap-1">
              <h3 className="text-small font-semibold">{s.label}</h3>
              <ul className="flex list-disc flex-col gap-1 pl-5 text-small">
                {stageSteps.map((x) => (
                  <li key={x.order}>
                    <span className="font-medium">{x.title}</span> ({whenLabel(x.startMonth)}): {x.detail}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </Card>

      <Card title="Step one">
        <p className="text-body font-semibold">{plan.stepOne.title}</p>
        <p className="text-small text-muted-foreground">{plan.stepOne.detail}</p>
      </Card>

      <Card title="Spending plan">
        <p className="text-small tabular-nums">
          {usd(plan.effectiveMonthlyIncome)} effective income − {usd(costs)} costs ={" "}
          <span className="font-semibold">{usd(plan.monthlySurplus)}/mo surplus</span> · fixed share {Math.round(plan.fixedShare * 100)}%
        </p>
        <dl>
          {plan.spendingPlan.map((b) => (
            <Row key={b.bucket} label={BUCKETS[b.bucket].label}>
              {usd(b.monthlyAmount)}/mo ({Math.round(b.percent)}%)
            </Row>
          ))}
          <Row label="Cushion target">
            {usd(plan.cushionTarget)}
            {plan.cushionFillsInMonths !== null ? `, fills in ${formatMonths(plan.cushionFillsInMonths)}` : ""}
          </Row>
          <Row label="3-month emergency fund">{usd(plan.emergencyFundTarget)}</Row>
        </dl>
      </Card>

      <Card title="Matched FNB products">
        <ul className="flex flex-col gap-3">
          {plan.matches.map((m) => {
            const fee = feeLine(m.termsToKnow);
            const rate = productById(m.productId)?.rateNote;
            return (
              <li key={`${m.productId}-${m.goalId}`} className="flex flex-col gap-0.5 text-small">
                <span className="font-semibold">
                  {productName(m.productId)} · {m.stage} · for {goalMeta(m.goalId).label} · {m.score}/100
                </span>
                {m.unlockCondition && <span>Unlocks: {m.unlockCondition}</span>}
                {fee && <span>Fees: {fee}</span>}
                {rate && <span>Rate: {rate}</span>}
                <span className="text-muted-foreground">{m.explanation}</span>
              </li>
            );
          })}
        </ul>
      </Card>

      {plan.notYet.length > 0 && (
        <Card title="Not yet, on purpose">
          <ul className="flex flex-col gap-2 text-small">
            {plan.notYet.map((n, i) => (
              <li key={i}>
                <span className="font-semibold">
                  {n.productId ? productName(n.productId) : n.goalId ? goalMeta(n.goalId).label : "Holding off"}:
                </span>{" "}
                {n.reason} Revisit {n.revisitWhen}.
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card title="Money snapshot">
        <dl>
          {snapshot.incomeSources.length === 0 && <Row label="Income">None listed</Row>}
          {snapshot.incomeSources.map((s, i) => (
            <Row key={i} label={INCOME_KIND[s.kind] ?? s.kind}>
              {usd(s.amount)}
              {FREQUENCY[s.frequency] ?? ""}
            </Row>
          ))}
          <Row label="Steady income">{snapshot.hasSteadyIncome ? "Yes" : "No"}</Row>
          <Row label="Fixed costs">{usd(snapshot.monthlyFixedCosts)}/mo</Row>
          <Row label="Debt payments">{usd(snapshot.monthlyDebtPayments)}/mo</Row>
          <Row label="Savings">{usd(snapshot.savingsBalance)}</Row>
          <Row label="Credit range">{snapshot.creditBand}</Row>
          <Row label="FNB customer">{snapshot.isFnbCustomer ? "Yes" : "No"}</Row>
        </dl>
      </Card>

      <p className="text-caption text-muted-foreground">{plan.disclaimer}</p>
    </div>
  );
}
