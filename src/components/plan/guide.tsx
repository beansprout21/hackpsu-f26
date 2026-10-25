"use client";

// The numbered step-by-step guide (docs/DASHBOARD.md v2), shared by the Overview (first 4 steps) and the
// Roadmap tab (full list), plus the stage look both use.
import type { ReactNode } from "react";
import { ExternalLink, ReceiptText, Shrub, Sprout, TreeDeciduous, type LucideIcon } from "lucide-react";
import { AskChip } from "@/components/chat/AskSprout";
import type { BlockChips, Chip } from "@/lib/client/chatCopy";
import { cn } from "@/lib/utils";
import type { Stage } from "@/types";
import { V2_COPY, type GuideStep } from "./overviewV2";

// Semantic stage colors: success = start now, brand = next, warning = unlocks later.
// Growing icon sizes (seedling, shrub, tree) are a deliberate exception to "icon = line height".
// Selected tints are mixed with the card color, not alpha, so the connector line can't show through a tile.
export const STAGES: {
  id: Stage;
  label: string;
  title: string;
  purpose: string;
  ask: string;
  icon: LucideIcon;
  size: string;
  dot: string;
  text: string;
  active: string;
}[] = [
  {
    id: "now",
    label: V2_COPY.stageHeadings.now,
    title: "Set up the basics",
    purpose: "A few small moves that make the rest of the plan run on its own.",
    ask: "Why should I do these first?",
    icon: Sprout,
    size: "size-5",
    dot: "bg-success-soft text-success",
    text: "text-success",
    active: "ring-2 ring-success bg-[color-mix(in_oklab,var(--color-success-soft)_40%,var(--color-card))]",
  },
  {
    id: "next",
    label: V2_COPY.stageHeadings.next,
    title: "Build momentum",
    purpose: "Once the basics are set, point your savings at your goals.",
    ask: "What has to happen before I move on to Next?",
    icon: Shrub,
    size: "size-6",
    dot: "bg-brand-100 text-brand-600",
    text: "text-brand-600",
    active: "ring-2 ring-brand-600 bg-brand-50",
  },
  {
    id: "later",
    label: V2_COPY.stageHeadings.later,
    title: "Make the bigger moves",
    purpose: "These open up as your income and credit grow. Not yet, on purpose.",
    ask: "What do I need before the Later steps?",
    icon: TreeDeciduous,
    size: "size-7",
    dot: "bg-warning-soft text-warning",
    text: "text-warning",
    active: "ring-2 ring-warning bg-[color-mix(in_oklab,var(--color-warning-soft)_40%,var(--color-card))]",
  },
];

export const stageMeta = (id: Stage) => STAGES.find((s) => s.id === id) ?? STAGES[0];

// The Ask Sprout chip for a product step: the FNB fit or path chip that names this product (docs/ASK_SPROUT.md).
export function productChip(chips: BlockChips, productId?: string): Chip | undefined {
  if (!productId) return undefined;
  const all = [...chips.fnbFit, ...(chips.path.now ?? []), ...(chips.path.next ?? []), ...(chips.path.later ?? [])];
  return all.find((c) => c.intent.productId === productId);
}

function FnbLink({ url }: { url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-small font-semibold text-info underline-offset-4 hover:underline focus-visible:ring-4 focus-visible:ring-info/30 focus-visible:outline-none"
    >
      {V2_COPY.seeAtFnb}
      <ExternalLink className="size-4" aria-hidden />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}

// One numbered step: the stage dot holds the number; product steps carry name, why, fee line, FNB link.
// `children` join the action row; `after` renders below it (the Roadmap's trust layer).
export function GuideStepRow({
  step,
  last,
  chip,
  id,
  onProduct,
  children,
  after,
}: {
  step: GuideStep;
  last: boolean;
  chip?: Chip;
  id?: string;
  onProduct: (productId: string) => void;
  children?: ReactNode;
  after?: ReactNode;
}) {
  const meta = stageMeta(step.stage);
  return (
    <li id={id} className="flex scroll-mt-36 gap-4">
      <div className="flex flex-col items-center" aria-hidden>
        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full text-small font-semibold tabular-nums", meta.dot)}>
          {step.n}
        </span>
        {!last && <span className="my-1 w-0.5 flex-1 rounded-full bg-border" />}
      </div>
      <div className={cn("flex min-w-0 flex-1 flex-col gap-1 pt-1", !last && "pb-4")}>
        {/* Stage label inline before the title, as the old "Your path" rows had it. */}
        <span className={cn("text-balance", step.kind === "move" ? "text-lead font-semibold" : "text-body font-semibold")}>
          <span className={cn("mr-2 text-caption font-semibold tracking-wide whitespace-nowrap uppercase", meta.text)}>
            {V2_COPY.stageHeadings[step.stage]}
          </span>
          {step.productId ? (
            <button
              type="button"
              onClick={() => onProduct(step.productId!)}
              className="rounded text-left underline-offset-4 outline-none hover:underline focus-visible:ring-4 focus-visible:ring-ring/30"
            >
              {step.title}
            </button>
          ) : (
            step.title
          )}
        </span>
        {step.detail && <span className="text-small text-muted-foreground">{step.detail}</span>}
        {step.unlock && <span className="text-small font-medium text-warning">{step.unlock}</span>}
        {(step.feeLine || children || step.url || chip) && (
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-2">
            {step.feeLine && (
              <span className="flex items-start gap-1 text-small">
                <ReceiptText className="mt-0.5 size-4 shrink-0 text-brand-600" aria-hidden />
                {step.feeLine}
              </span>
            )}
            {children}
            {step.url && <FnbLink url={step.url} />}
            {chip && <AskChip chip={chip} />}
          </div>
        )}
        {after}
      </div>
    </li>
  );
}
