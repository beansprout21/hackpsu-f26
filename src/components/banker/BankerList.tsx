// /banker list (#54): one card per shared plan, newest first. Server component; read-only.
import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight, Inbox } from "lucide-react";
import { LIFE_STAGES } from "@/components/intake/copy";
import { usd } from "@/components/plan/format";
import { listSummaries } from "@/lib/server/share";
import type { SharedPlanSummary } from "@/types";
import { bankerAccess } from "./access";
import { BankerNotice } from "./Notice";
import { shortDate } from "./format";

const lifeStageLabel = (id: SharedPlanSummary["lifeStage"]) => LIFE_STAGES.find((s) => s.id === id)?.label ?? id;

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col">
      <dt className="text-caption text-muted-foreground">{label}</dt>
      <dd className="text-small font-medium break-words">{children}</dd>
    </div>
  );
}

export async function BankerList() {
  const access = await bankerAccess();
  if (access.kind !== "ok") return <BankerNotice kind={access.kind} />;
  let plans: SharedPlanSummary[];
  try {
    plans = await listSummaries(access.redis);
  } catch {
    return <BankerNotice kind="unavailable" />;
  }

  if (plans.length === 0) {
    return (
      <section className="flex flex-col items-center gap-3 rounded-2xl bg-card p-10 text-center shadow-card">
        <Inbox className="size-8 text-muted-foreground" aria-hidden />
        <p className="text-body font-semibold">No shared plans yet.</p>
        <p className="text-small text-muted-foreground">When a customer chooses Share with FNB on their plan, it shows up here for 30 days.</p>
      </section>
    );
  }

  return (
    <ul className="flex flex-col gap-4" aria-label="Shared plans">
      {plans.map((p) => (
        <li key={p.id}>
          <Link
            href={`/banker/${p.id}`}
            className="group flex flex-col gap-4 rounded-2xl bg-card p-5 shadow-card outline-none transition-shadow hover:shadow-raised focus-visible:ring-4 focus-visible:ring-ring/40 motion-reduce:transition-none"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-lead font-semibold">{p.contactName || "Unnamed customer"}</span>
              <span className="flex items-center gap-1 text-caption text-muted-foreground">
                Shared {shortDate(p.sharedAt)}
                <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden />
              </span>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
              <Field label="Life stage">{lifeStageLabel(p.lifeStage)}</Field>
              <Field label="Persona">{p.persona.label}</Field>
              <Field label="Top goal">{p.topGoalLabel || "Not set"}</Field>
              <Field label="Monthly surplus">{usd(p.monthlySurplus)}</Field>
              <Field label="Step one">{p.stepOneTitle}</Field>
              <Field label="FNB customer">{p.isFnbCustomer ? "Yes" : "No"}</Field>
            </dl>
          </Link>
        </li>
      ))}
    </ul>
  );
}
