"use client";

import { CalendarCheck, Hourglass, Quote } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SproutSays } from "@/components/sprout/SproutSays";
import { goalMeta } from "@/components/intake/copy";
import type { GoalProfile, NotYet, Plan, PlanStep } from "@/types";
import { productName } from "./format";
import { STEP_ICONS } from "./Roadmap";

const BANKER_URL = "https://www.fnb-online.com/schedule-an-appointment";

export function StepOneCard({ step }: { step: PlanStep }) {
  const Icon = STEP_ICONS[step.kind];
  return (
    <section
      aria-labelledby="step-one"
      className="flex flex-col gap-3 rounded-3xl border-2 border-primary bg-secondary p-5 shadow-sm sm:p-6"
    >
      <span className="flex items-center gap-2 text-sm font-semibold tracking-wide text-highlight uppercase">
        <Icon className="size-4" aria-hidden />
        Start here this week
      </span>
      <h2 id="step-one" className="text-2xl leading-tight font-semibold tracking-tight sm:text-3xl">
        {step.title}
      </h2>
      <p className="text-base leading-relaxed text-muted-foreground">{step.detail}</p>
      {step.productId && (
        <span className="self-start rounded-full bg-background px-3 py-1 text-sm font-medium">
          {productName(step.productId)}
        </span>
      )}
    </section>
  );
}

export function SproutIntro({ plan, profile }: { plan: Plan; profile: GoalProfile }) {
  return (
    <section aria-labelledby="plan-headline" className="flex flex-col gap-4">
      <SproutSays>{plan.sproutSays}</SproutSays>
      <div className="flex flex-col gap-3 rounded-2xl border border-border p-5">
        <span className="self-start rounded-full bg-highlight px-3 py-1 text-xs font-semibold text-highlight-foreground">
          {profile.persona.label}
        </span>
        <h2 id="plan-headline" className="text-xl font-semibold tracking-tight">
          {plan.headline}
        </h2>
        <p className="text-muted-foreground">{profile.persona.description}</p>
        <blockquote className="flex gap-3 rounded-xl bg-muted p-4 text-sm italic leading-relaxed">
          <Quote className="size-4 shrink-0 text-primary" aria-hidden />
          {profile.richLifeStatement}
        </blockquote>
      </div>
    </section>
  );
}

export function NotYetCard({ items }: { items: NotYet[] }) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="not-yet" className="flex flex-col gap-3 rounded-2xl border border-dashed border-border p-5">
      <h2 id="not-yet" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
        <Hourglass className="size-5 text-highlight" aria-hidden />
        Not yet, on purpose
      </h2>
      <ul className="flex flex-col gap-3">
        {items.map((n, i) => (
          <li key={i} className="flex flex-col gap-1">
            <span className="font-medium">
              {n.productId ? productName(n.productId) : n.goalId ? goalMeta(n.goalId).label : "Holding off"}
            </span>
            <span className="text-sm leading-relaxed">{n.reason}</span>
            <span className="text-sm text-muted-foreground">Revisit {n.revisitWhen}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function BankerCta({ summary }: { summary: string }) {
  function book() {
    const copied = navigator.clipboard?.writeText(summary);
    window.open(BANKER_URL, "_blank", "noopener,noreferrer");
    Promise.resolve(copied)
      .then(() => toast.success("Plan summary copied. Paste it into your appointment notes."))
      .catch(() => toast.info("Appointment page opened. Copy your summary from this page if you need it."));
  }

  return (
    <section
      aria-labelledby="banker"
      className="flex flex-col gap-4 rounded-3xl bg-highlight p-5 text-highlight-foreground sm:flex-row sm:items-center sm:justify-between sm:p-6"
    >
      <div className="flex flex-col gap-1">
        <h2 id="banker" className="text-xl font-semibold tracking-tight">
          Want a second set of eyes?
        </h2>
        <p className="text-sm opacity-90">
          We&apos;ll copy a summary of this plan so a banker knows your goals before you meet.
        </p>
      </div>
      <Button
        size="lg"
        onClick={book}
        className="h-12 shrink-0 bg-background px-6 text-base font-semibold text-foreground hover:bg-background/90"
      >
        <span className="inline-flex items-center gap-2">
          <CalendarCheck aria-hidden />
          Book with a banker
        </span>
      </Button>
    </section>
  );
}
