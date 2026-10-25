import { BadgeCheck, ChevronDown, Link2, TreeDeciduous } from "lucide-react";
import { goalMeta } from "@/components/intake/copy";
import { GOAL_LABELS } from "@/lib/server/engine/defaults";
import { cn } from "@/lib/utils";
import type { Confidence, Match } from "@/types";
import { formatDate, productById, productName } from "./format";

const CONFIDENCE: Record<Confidence, { label: string; className: string }> = {
  high: { label: "High confidence", className: "bg-success-soft text-success" },
  medium: { label: "Medium confidence", className: "bg-warning-soft text-warning" },
  low: { label: "Low confidence", className: "bg-muted text-muted-foreground" },
};

const SCORE_PARTS = [
  { key: "goalFit", label: "Fits your goal", max: 40 },
  { key: "eligibility", label: "You qualify", max: 25 },
  { key: "affordability", label: "Fits your budget", max: 20 },
  { key: "priority", label: "Your priority", max: 15 },
] as const;

export function MatchCard({ match }: { match: Match }) {
  const product = productById(match.productId);
  const goal = goalMeta(match.goalId);
  const conf = CONFIDENCE[match.confidence];
  return (
    <article className="flex flex-col gap-4 rounded-2xl bg-card p-6 shadow-card">
      <header className="flex flex-col gap-2">
        <h4 className="text-body font-semibold">{productName(match.productId)}</h4>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2 py-1 text-caption font-semibold text-brand-700">
            <goal.icon className="size-4" aria-hidden />
            {GOAL_LABELS[match.goalId]}
          </span>
          <span className={cn("rounded-full px-2 py-1 text-caption font-semibold", conf.className)}>
            {conf.label}
          </span>
        </div>
      </header>

      {match.stage === "later" && match.unlockCondition && (
        <p className="flex items-start gap-2 rounded-xl bg-warning-soft px-4 py-3 text-small font-medium text-warning">
          <TreeDeciduous className="size-5 shrink-0" aria-hidden />
          {match.unlockCondition}
        </p>
      )}

      <p className="text-small">{match.explanation}</p>

      {match.termsToKnow.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-caption font-semibold tracking-wide text-muted-foreground uppercase">Terms to know</span>
          <ul className="flex list-disc flex-col gap-1 pl-4 text-small">
            {match.termsToKnow.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      )}

      {product?.rateNote && <p className="text-caption text-muted-foreground">{product.rateNote}</p>}

      <details className="group rounded-xl bg-muted px-4 py-2">
        <summary className="flex cursor-pointer list-none items-center justify-between text-caption font-semibold text-muted-foreground [&::-webkit-details-marker]:hidden">
          Why this match: {match.score}/100
          <ChevronDown className="size-4 transition-transform duration-200 group-open:rotate-180" aria-hidden />
        </summary>
        <dl className="mt-2 flex flex-col gap-2 pb-2">
          {SCORE_PARTS.map((p) => {
            const value = match.breakdown[p.key];
            return (
              <div key={p.key} className="grid grid-cols-[7rem_1fr_3rem] items-center gap-2 text-caption">
                <dt className="text-muted-foreground">{p.label}</dt>
                <dd className="h-2 overflow-hidden rounded-full bg-card">
                  <span className="block h-full rounded-full bg-brand-400" style={{ width: `${(value / p.max) * 100}%` }} />
                </dd>
                <dd className="text-right tabular-nums">
                  {value}/{p.max}
                </dd>
              </div>
            );
          })}
        </dl>
      </details>

      <footer className="flex flex-wrap items-center justify-between gap-2 text-caption text-info">
        <a
          href={match.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded underline-offset-2 hover:underline focus-visible:ring-4 focus-visible:ring-info/30 focus-visible:outline-none"
        >
          <Link2 className="size-4" aria-hidden />
          Source: product page
          <span className="sr-only">(opens in a new tab)</span>
        </a>
        {product?.verified && (
          <span className="inline-flex items-center gap-1">
            <BadgeCheck className="size-4" aria-hidden />
            Verified {formatDate(product.verified)}
          </span>
        )}
      </footer>
    </article>
  );
}
