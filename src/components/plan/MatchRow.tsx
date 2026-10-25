"use client";

import { BadgeCheck, ChevronDown, Link2, TreeDeciduous } from "lucide-react";
import { AskChip } from "@/components/chat/AskSprout";
import { goalMeta } from "@/components/intake/copy";
import { cn } from "@/lib/utils";
import type { Confidence, Match } from "@/types";
import { formatDate, productById, productName } from "./format";

const CONFIDENCE: Record<Confidence, { label: string; className: string }> = {
  high: { label: "High confidence", className: "bg-success-soft text-success" },
  medium: { label: "Medium confidence", className: "bg-warning-soft text-warning" },
  low: { label: "Low confidence", className: "bg-muted text-muted-foreground" },
};

export const matchKey = (m: Match) => `${m.productId}-${m.goalId}`;

// The trust layer for one product: unlock, why it fits, terms, rate, source, verified date. Score
// breakdowns stay on the banker dashboard only (docs/DASHBOARD.md).
export function TrustLayer({ match, className }: { match: Match; className?: string }) {
  const product = productById(match.productId);
  const conf = CONFIDENCE[match.confidence];
  const name = productName(match.productId);
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <span className={cn("self-start rounded-full px-2 py-1 text-caption font-semibold", conf.className)}>{conf.label}</span>
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

      <div className="flex flex-wrap items-center justify-between gap-2 text-caption text-info">
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
      </div>
      <AskChip question={`Is ${name} right for me?`} />
    </div>
  );
}

// One product as a collapsed row; the trust layer opens on click.
export function MatchRow({ match, open, onToggle }: { match: Match; open: boolean; onToggle: (open: boolean) => void }) {
  const goal = goalMeta(match.goalId);
  const conf = CONFIDENCE[match.confidence];
  const name = productName(match.productId);

  return (
    <li id={`product-${matchKey(match)}`} className="scroll-mt-24">
      <details
        open={open}
        onToggle={(e) => {
          if (e.currentTarget.open !== open) onToggle(e.currentTarget.open);
        }}
        className="group"
      >
        <summary className="flex cursor-pointer list-none items-center gap-3 rounded-xl px-2 py-3 outline-none transition-colors hover:bg-brand-50 focus-visible:ring-4 focus-visible:ring-ring/30 [&::-webkit-details-marker]:hidden">
          <goal.icon className="size-5 shrink-0 text-brand-600" aria-hidden />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-body font-semibold">{name}</span>
            <span className="text-caption text-muted-foreground">{goal.label}</span>
          </span>
          <span className={cn("hidden shrink-0 rounded-full px-2 py-1 text-caption font-semibold sm:inline", conf.className)}>
            {conf.label}
          </span>
          <ChevronDown className="size-5 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180" aria-hidden />
        </summary>

        <TrustLayer match={match} className="px-2 pt-1 pb-4 pl-10 sm:[&>span:first-child]:hidden" />
      </details>
    </li>
  );
}
