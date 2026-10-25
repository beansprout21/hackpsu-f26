import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { goalMeta } from "@/components/intake/copy";
import { LinkPendingIcon } from "@/components/layout/LinkPendingIcon";
import type { GoalId } from "@/types";

// The landing page's first question (#85): picking a chip is the user's first survey answer.
// /intake?goal=<id> pre-selects that goal on the goals step. Icons match the goals step.
const CHOICES: { label: string; goal: GoalId }[] = [
  { label: "A trip", goal: "travel" },
  { label: "A safety cushion", goal: "emergency_fund" },
  { label: "My first place", goal: "first_home" },
];

const STAGGER_MS = 60;

export function GoalChoices() {
  return (
    <div className="flex flex-col gap-4">
      <p id="goal-choices" className="text-body font-semibold">
        What are you growing toward?
      </p>
      <ul aria-labelledby="goal-choices" className="grid gap-3 xl:grid-cols-3">
        {CHOICES.map(({ label, goal }, i) => {
          const Icon = goalMeta(goal).icon;
          return (
            <li
              key={goal}
              // "backwards" fill keeps each chip hidden during its delay without pinning the end
              // transform, so the hover lift still works after the entrance.
              className="animate-in fade-in slide-in-from-bottom-2 duration-200 ease-out motion-reduce:animate-none"
              style={{ animationDelay: `${i * STAGGER_MS}ms`, animationFillMode: "backwards" }}
            >
              <Link
                href={`/intake?goal=${goal}`}
                className="group flex h-full min-h-14 items-center gap-2 rounded-xl bg-primary px-4 py-3 text-lead font-semibold text-primary-foreground shadow-card outline-none transition-[background-color,box-shadow,translate] duration-200 select-none hover:-translate-y-0.5 hover:bg-primary-hover hover:shadow-raised focus-visible:ring-4 focus-visible:ring-ring/40 active:translate-y-0 active:bg-primary-active active:shadow-card motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                <Icon className="size-6 shrink-0" aria-hidden />
                <span className="flex-1 leading-tight">{label}</span>
                <LinkPendingIcon className="size-6 shrink-0">
                  <ArrowRight
                    className="size-6 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
                    aria-hidden
                  />
                </LinkPendingIcon>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
