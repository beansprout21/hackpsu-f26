"use client";

import { useRef, useState } from "react";
import { CalendarCheck, CalendarClock, Check, Hourglass, Quote, Sprout } from "lucide-react";
import { toast } from "sonner";
import { SproutSays } from "@/components/sprout/SproutSays";
import { goalMeta } from "@/components/intake/copy";
import { cn } from "@/lib/utils";
import type { GoalProfile, NotYet, Plan, PlanStep } from "@/types";
import { productName } from "./format";
import { STEP_ICONS } from "./icons";

const BANKER_URL = "https://www.fnb-online.com/schedule-an-appointment";

export function PlanHero({ plan, profile }: { plan: Plan; profile: GoalProfile }) {
  return (
    <section aria-labelledby="plan-headline" className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <span className="inline-flex items-center gap-2 self-start rounded-full bg-brand-100 px-3 py-1 text-small font-semibold text-brand-700">
            <Sprout className="size-5" aria-hidden />
            {profile.persona.label}
          </span>
          <p className="text-small text-muted-foreground">{profile.persona.description}</p>
        </div>
        <h1 id="plan-headline" className="text-title font-semibold text-balance">
          {plan.headline}
        </h1>
        <blockquote className="flex gap-3 text-lead text-brand-700 italic">
          <Quote className="size-7 shrink-0 text-brand-400" aria-hidden />
          {profile.richLifeStatement}
        </blockquote>
      </div>
      <SproutSays>{plan.sproutSays}</SproutSays>
    </section>
  );
}

export function StepOneCard({ step }: { step: PlanStep }) {
  const Icon = STEP_ICONS[step.kind];
  return (
    <article
      aria-labelledby="step-one"
      className="flex flex-col gap-4 rounded-2xl bg-card p-6 shadow-card ring-2 ring-success/30"
    >
      <span className="flex items-center gap-2 text-small font-semibold tracking-wide text-success uppercase">
        <Icon className="size-5" aria-hidden />
        Start here this week
      </span>
      <div className="flex flex-col gap-2">
        <h3 id="step-one" className="text-lead font-semibold">
          {step.title}
        </h3>
        <p className="text-body text-muted-foreground">{step.detail}</p>
      </div>
      {step.productId && (
        <span className="self-start rounded-full bg-brand-100 px-3 py-1 text-small font-medium text-brand-700">
          {productName(step.productId)}
        </span>
      )}
    </article>
  );
}

export function NotYetCard({ items }: { items: NotYet[] }) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="not-yet" className="flex flex-col gap-4 rounded-2xl bg-card p-6 shadow-card">
      <h2 id="not-yet" className="flex items-center gap-2 text-lead font-semibold">
        <Hourglass className="size-7 text-warning" aria-hidden />
        Not yet, on purpose
      </h2>
      <ul className="flex flex-col gap-6">
        {items.map((n, i) => (
          <li key={i} className="flex flex-col gap-1">
            <span className="text-body font-semibold">
              {n.productId ? productName(n.productId) : n.goalId ? goalMeta(n.goalId).label : "Holding off"}
            </span>
            <span className="text-small">{n.reason}</span>
            <span className="flex items-center gap-1 text-caption text-muted-foreground">
              <CalendarClock className="size-4" aria-hidden />
              Revisit {n.revisitWhen}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function BankerCta({ summary }: { summary: string }) {
  const [chip, setChip] = useState<"hidden" | "in" | "out">("hidden");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  function showCopied() {
    timers.current.forEach(clearTimeout);
    setChip("in");
    timers.current = [setTimeout(() => setChip("out"), 1400), setTimeout(() => setChip("hidden"), 1600)];
  }

  function book() {
    const copied = navigator.clipboard?.writeText(summary);
    window.open(BANKER_URL, "_blank", "noopener,noreferrer");
    Promise.resolve(copied)
      .then(() => {
        showCopied();
        toast.success("Plan summary copied. Paste it into your appointment notes.");
      })
      .catch(() => toast.info("Appointment page opened. Copy your summary from this page if you need it."));
  }

  return (
    <section
      aria-labelledby="banker"
      className="flex flex-col gap-6 rounded-2xl bg-card p-6 shadow-card sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex flex-col gap-1">
        <h2 id="banker" className="text-lead font-semibold">
          Want a second set of eyes?
        </h2>
        <p className="text-small text-muted-foreground">
          We&apos;ll copy a summary of this plan so a banker knows your goals before you meet.
        </p>
      </div>
      <div className="relative shrink-0">
        {chip !== "hidden" && (
          <span
            role="status"
            className={cn(
              "absolute -top-10 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-success px-3 py-1 text-caption font-semibold text-white shadow-raised",
              chip === "in" ? "animate-in fade-in slide-in-from-bottom-2 duration-200" : "animate-out fade-out duration-200",
              "motion-reduce:animate-none",
            )}
          >
            <Check className="size-4" aria-hidden />
            Copied
          </span>
        )}
        <button
          type="button"
          onClick={book}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 text-body font-semibold text-primary-foreground shadow-card transition-[background-color,box-shadow,transform] duration-200 outline-none select-none hover:bg-primary-hover hover:shadow-raised focus-visible:ring-4 focus-visible:ring-ring/40 active:translate-y-px active:bg-primary-active disabled:pointer-events-none disabled:opacity-50 sm:w-auto motion-reduce:transition-none"
        >
          <CalendarCheck className="size-6" aria-hidden />
          Book with a banker
        </button>
      </div>
    </section>
  );
}
