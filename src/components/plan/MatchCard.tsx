import { ChevronDown, ExternalLink, Sprout } from "lucide-react";
import { goalMeta } from "@/components/intake/copy";
import { GOAL_LABELS } from "@/lib/server/engine/defaults";
import { cn } from "@/lib/utils";
import type { Confidence, Match } from "@/types";
import { formatDate, productById, productName } from "./format";

const CONFIDENCE: Record<Confidence, { label: string; className: string }> = {
  high: { label: "High confidence", className: "bg-conf-high/10 text-conf-high" },
  medium: { label: "Medium confidence", className: "bg-conf-medium/10 text-conf-medium" },
  low: { label: "Low confidence", className: "bg-conf-low/10 text-conf-low" },
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
    <article className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-1">
          <h4 className="font-semibold leading-snug">{productName(match.productId)}</h4>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <goal.icon className="size-3.5 text-highlight" aria-hidden />
            For your {GOAL_LABELS[match.goalId]} goal
          </span>
        </div>
        <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-medium", conf.className)}>
          {conf.label}
        </span>
      </header>

      {match.stage === "later" && match.unlockCondition && (
        <p className="flex items-start gap-2 rounded-xl bg-secondary px-3 py-2 text-sm font-medium">
          <Sprout className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          {match.unlockCondition}
        </p>
      )}

      <p className="text-sm leading-relaxed">{match.explanation}</p>

      {match.termsToKnow.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Terms to know</span>
          <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
            {match.termsToKnow.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      )}

      {product?.rateNote && <p className="text-xs text-muted-foreground">{product.rateNote}</p>}

      <details className="group rounded-xl bg-muted px-3 py-2">
        <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium [&::-webkit-details-marker]:hidden">
          Why this match: {match.score}/100
          <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
        </summary>
        <dl className="mt-3 flex flex-col gap-2">
          {SCORE_PARTS.map((p) => {
            const value = match.breakdown[p.key];
            return (
              <div key={p.key} className="grid grid-cols-[8rem_1fr_3rem] items-center gap-2 text-xs">
                <dt className="text-muted-foreground">{p.label}</dt>
                <dd className="h-2 overflow-hidden rounded-full bg-background">
                  <span className="block h-full rounded-full bg-primary" style={{ width: `${(value / p.max) * 100}%` }} />
                </dd>
                <dd className="text-right tabular-nums">
                  {value}/{p.max}
                </dd>
              </div>
            );
          })}
        </dl>
      </details>

      <footer className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <a
          href={match.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded underline-offset-2 hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          Source: product page
          <ExternalLink className="size-3" aria-hidden />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
        {product?.verified && <span>Verified {formatDate(product.verified)}</span>}
      </footer>
    </article>
  );
}
