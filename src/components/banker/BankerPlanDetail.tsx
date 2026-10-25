// /banker/[id] detail (#54, layout #181): what a banker reads before the meeting. Server component; read-only.
// Order: header, at a glance, before the meeting, goals, products, timeline, spending + snapshot, not yet.
import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";
import { goalMeta, LIFE_STAGES } from "@/components/intake/copy";
import { BUCKETS, formatMonths, productById, productName, usd, whenLabel } from "@/components/plan/format";
import { getSharedPlan } from "@/lib/server/share";
import type { SharedPlan, Stage } from "@/types";
import { bankerAccess } from "./access";
import { BankerNotice } from "./Notice";
import { BADGE, feeLine, FREQUENCY, INCOME_KIND, shortDate } from "./format";
import { PrintButton } from "./PrintButton";

// Hides every top-level page block (header, footer) that does not contain this detail when printing.
const HIDE_PAGE_CHROME = "print:[body>*:not(:has(&))]:hidden";

const STAGES: { id: Stage; label: string }[] = [
  { id: "now", label: "Now" },
  { id: "next", label: "Next" },
  { id: "later", label: "Later" },
];
const stageLabel = (id: Stage) => STAGES.find((s) => s.id === id)?.label ?? id;

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

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-2xl bg-card p-4 shadow-card print:break-inside-avoid print:p-0 print:shadow-none">
      <span className="text-caption text-muted-foreground">{label}</span>
      <span className="text-lead font-semibold tabular-nums">{value}</span>
      {sub && <span className="text-caption text-muted-foreground">{sub}</span>}
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
  const onTrack = plan.allocation.filter((a) => a.onTrack).length;

  return (
    <div className={`flex flex-col gap-6 ${HIDE_PAGE_CHROME}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/banker" className="inline-flex items-center gap-1 text-small font-semibold text-primary underline-offset-4 hover:underline">
          <ArrowLeft className="size-4" aria-hidden /> All shared plans
        </Link>
        <PrintButton />
      </div>

      <header className="flex flex-col gap-3 rounded-2xl bg-card p-6 shadow-card print:p-0 print:shadow-none">
        <h1 className="text-title font-semibold">{contact.name || "Unnamed customer"}</h1>
        <div className="flex flex-wrap gap-1.5">
          <span className={BADGE}>{profile.persona.label}</span>
          <span className={BADGE}>{LIFE_STAGES.find((s) => s.id === intake.lifeStage)?.label ?? intake.lifeStage}</span>
          <span className={BADGE}>{snapshot.isFnbCustomer ? "FNB customer" : "New to FNB"}</span>
        </div>
        {contact.email && (
          <a href={`mailto:${contact.email}`} className="inline-flex items-center gap-1.5 self-start text-small text-primary underline-offset-4 hover:underline">
            <Mail className="size-4" aria-hidden /> {contact.email}
          </a>
        )}
        <p className="text-small text-muted-foreground italic">&ldquo;{profile.richLifeStatement}&rdquo;</p>
        <p className="text-caption text-muted-foreground">
          Shared {shortDate(shared.sharedAt)} · Kept until {shortDate(shared.expiresAt)} · Consent {shared.consentVersion}
        </p>
      </header>

      <section aria-label="At a glance" className="grid grid-cols-2 gap-4 sm:grid-cols-4 print:grid-cols-2">
        <Tile label="Effective income" value={`${usd(plan.effectiveMonthlyIncome)}/mo`} />
        <Tile label="To work with" value={`${usd(plan.monthlySurplus)}/mo`} />
        <Tile
          label="Cushion target"
          value={usd(plan.cushionTarget)}
          sub={plan.cushionFillsInMonths !== null ? `full in ${formatMonths(plan.cushionFillsInMonths)}` : undefined}
        />
        <Tile label="Goals on track" value={plan.allocation.length ? `${onTrack} of ${plan.allocation.length}` : "None set"} />
      </section>

      <Card title="Before the meeting">
        <p className="text-body leading-relaxed">{plan.bankerSummary}</p>
        <div className="flex flex-col gap-1 border-t border-border pt-3">
          <span className="text-caption text-muted-foreground">Step one</span>
          <p className="text-body font-semibold">{plan.stepOne.title}</p>
          <p className="text-small text-muted-foreground">{plan.stepOne.detail}</p>
        </div>
      </Card>

      <Card title="Goals">
        <ul className="flex flex-col divide-y divide-border">
          {plan.allocation.map((a) => {
            const g = goalById.get(a.goalId);
            return (
              <li key={a.goalId} className="flex flex-col gap-1 py-3 text-small first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                  <div className="flex min-w-0 flex-col">
                    <span className="font-semibold">{goalMeta(a.goalId).label}</span>
                    {g && (
                      <span className="text-muted-foreground">
                        Priority {g.priority} · {usd(g.targetAmount)}
                        {g.targetIsEstimate ? " (estimate)" : ""} in {formatMonths(g.horizonMonths)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="tabular-nums">
                      {usd(a.monthlyAmount)}/mo of {usd(a.requiredMonthly)}/mo
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-caption font-medium ${a.onTrack ? "bg-brand-100 text-brand-700" : "bg-warning-soft text-warning"}`}
                    >
                      {a.onTrack ? "On track" : "Needs a boost"}
                    </span>
                  </div>
                </div>
                {a.monthlyAmount > 0 && <span className="text-muted-foreground">At this pace, {formatMonths(a.monthsToTarget)}</span>}
                {g?.motivation && <span className="text-muted-foreground">{g.motivation}</span>}
              </li>
            );
          })}
        </ul>
      </Card>

      <Card title="Recommended FNB products">
        <ul className="flex flex-col divide-y divide-border">
          {plan.matches.map((m) => {
            const fee = feeLine(m.termsToKnow);
            const rate = productById(m.productId)?.rateNote;
            return (
              <li key={`${m.productId}-${m.goalId}`} className="flex flex-col gap-1 py-3 text-small first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-semibold">{productName(m.productId)}</span>
                  <span className={BADGE}>{stageLabel(m.stage)}</span>
                  <span className={BADGE}>{goalMeta(m.goalId).label}</span>
                </div>
                {m.unlockCondition && <span className="text-muted-foreground">Unlocks: {m.unlockCondition}</span>}
                {fee && <span className="text-muted-foreground">Fees: {fee}</span>}
                {rate && <span className="text-muted-foreground">Rate: {rate}</span>}
                <span>{m.explanation}</span>
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
            <div key={s.id} className="flex flex-col gap-2">
              <h3 className="text-small font-semibold text-primary">{s.label}</h3>
              <ul className="flex flex-col gap-2 text-small">
                {stageSteps.map((x) => (
                  <li key={x.order} className="flex flex-col gap-0.5">
                    <span>
                      <span className="font-semibold">{x.title}</span> <span className="text-muted-foreground">{whenLabel(x.startMonth)}</span>
                    </span>
                    <span className="text-muted-foreground">{x.detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
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
      </div>

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

      <p className="text-caption text-muted-foreground">{plan.disclaimer}</p>
    </div>
  );
}
