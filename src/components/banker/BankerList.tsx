// /banker list (#54, layout #181): one card per shared plan, newest first. Server component; read-only.
import Link from "next/link";
import { ChevronRight, Inbox } from "lucide-react";
import { LIFE_STAGES } from "@/components/intake/copy";
import { usd } from "@/components/plan/format";
import { listSummaries } from "@/lib/server/share";
import type { SharedPlanSummary } from "@/types";
import { bankerAccess } from "./access";
import { BankerNotice } from "./Notice";
import { BADGE, shortDate } from "./format";

const lifeStageLabel = (id: SharedPlanSummary["lifeStage"]) => LIFE_STAGES.find((s) => s.id === id)?.label ?? id;

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
    <div className="flex flex-col gap-3">
      <p className="text-small font-semibold">
        {plans.length} shared {plans.length === 1 ? "plan" : "plans"}
      </p>
      <ul className="flex flex-col gap-4" aria-label="Shared plans">
        {plans.map((p) => (
          <li key={p.id}>
            <Link
              href={`/banker/${p.id}`}
              className="group flex flex-col gap-3 rounded-2xl bg-card p-5 shadow-card outline-none transition-shadow hover:shadow-raised focus-visible:ring-4 focus-visible:ring-ring/40 motion-reduce:transition-none"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <span className="min-w-0 text-lead font-semibold break-words">{p.contactName || "Unnamed customer"}</span>
                <span className="text-lead font-semibold tabular-nums">
                  {usd(p.monthlySurplus)}/mo <span className="text-small font-normal text-muted-foreground">to work with</span>
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className={BADGE}>{p.persona.label}</span>
                <span className={BADGE}>{lifeStageLabel(p.lifeStage)}</span>
                <span className={BADGE}>{p.isFnbCustomer ? "FNB customer" : "New to FNB"}</span>
              </div>
              <div className="flex min-w-0 flex-col gap-0.5 text-small">
                <p className="truncate">
                  <span className="text-muted-foreground">Top goal:</span> {p.topGoalLabel || "Not set"}
                </p>
                <p className="truncate">
                  <span className="text-muted-foreground">Step one:</span> {p.stepOneTitle}
                </p>
              </div>
              <span className="flex items-center gap-1 self-end text-caption text-muted-foreground">
                Shared {shortDate(p.sharedAt)}
                <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
