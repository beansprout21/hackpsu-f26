"use client";

import { usePathname } from "next/navigation";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { href: "/intake", label: "Dreams" },
  { href: "/snapshot", label: "Money" },
  { href: "/plan", label: "Plan" },
] as const;

export function StepIndicator() {
  const pathname = usePathname();
  const current = STEPS.findIndex((s) => pathname.startsWith(s.href));
  if (current === -1) return null;

  return (
    <nav aria-label="Progress">
      <p className="text-small font-medium text-muted-foreground sm:hidden">
        Step {current + 1} of {STEPS.length}:{" "}
        <span className="text-foreground">{STEPS[current].label}</span>
      </p>
      <ol className="hidden items-center gap-2 sm:flex">
        {STEPS.map((step, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li key={step.href} className="flex items-center gap-2">
              {i > 0 && (
                <span
                  aria-hidden
                  className={cn("h-px w-6 bg-border", done || active ? "bg-primary" : "")}
                />
              )}
              <span
                aria-current={active ? "step" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-full px-3 py-1 text-small font-medium",
                  active && "bg-highlight text-highlight-foreground",
                  done && "text-foreground [&_svg]:text-primary",
                  !active && !done && "text-muted-foreground",
                )}
              >
                {done && <Check className="size-3.5" aria-hidden />}
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
