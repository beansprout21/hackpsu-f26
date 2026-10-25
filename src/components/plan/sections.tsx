"use client";

import { useRef, useState, type ReactNode } from "react";
import { CalendarCheck, Check, Quote } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { GoalProfile, Plan } from "@/types";

const BANKER_URL = "https://www.fnb-online.com/schedule-an-appointment";

// Above the tabs: the plan headline and the user's rich life. The persona chip lives in the Overview's
// first block (#71), and the numbers live in the Overview blocks instead of stat tiles.
export function SummaryHeader({ plan, profile }: { plan: Plan; profile: GoalProfile }) {
  return (
    <section aria-labelledby="plan-headline" className="flex flex-col gap-3">
      <h1 id="plan-headline" className="text-lead font-semibold text-balance sm:text-title">
        {plan.headline}
      </h1>
      <blockquote className="flex gap-2 text-body text-brand-700 italic">
        <Quote className="size-6 shrink-0 text-brand-400" aria-hidden />
        <span className="line-clamp-2 sm:line-clamp-none">{profile.richLifeStatement}</span>
      </blockquote>
    </section>
  );
}

export function BankerCta({ summary, title = "Talk it through with a person", children }: { summary: string; title?: string; children?: ReactNode }) {
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
      className="flex flex-col gap-4 rounded-2xl bg-card p-6 shadow-card"
    >
      <div className="flex flex-col gap-1">
        <h2 id="banker" className="text-lead font-semibold">
          {title}
        </h2>
        <p className="text-small text-muted-foreground">
          We&apos;ll copy a summary of this plan so an FNB banker knows your goals before you meet.
        </p>
      </div>
      <div className="relative">
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
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 text-body font-semibold text-primary-foreground shadow-card transition-[background-color,box-shadow,transform] duration-200 outline-none select-none hover:bg-primary-hover hover:shadow-raised focus-visible:ring-4 focus-visible:ring-ring/40 active:translate-y-px active:bg-primary-active disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none"
        >
          <CalendarCheck className="size-6" aria-hidden />
          Book with an FNB banker
        </button>
      </div>
      {children}
    </section>
  );
}
