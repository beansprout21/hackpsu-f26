import { Calendar, Flag, Shrub, Sprout, Trophy, TreeDeciduous, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Match, Plan, PlanStep, Stage } from "@/types";
import { LIFE_EVENTS, whenLabel } from "./format";
import { STEP_ICONS } from "./icons";
import { MatchCard } from "./MatchCard";
import { StepOneCard } from "./sections";

// Semantic stage colors: success = start here, brand = next, warning = later.
// Growing icon sizes (seedling, shrub, tree) are a deliberate exception to "icon = line height".
const STAGES: { id: Stage; label: string; blurb: string; icon: LucideIcon; size: string; dot: string; text: string }[] = [
  { id: "now", label: "Start here", blurb: "Things you can do now.", icon: Sprout, size: "size-5", dot: "bg-success-soft text-success", text: "text-success" },
  { id: "next", label: "Next", blurb: "Once the basics are set.", icon: Shrub, size: "size-6", dot: "bg-brand-100 text-brand-600", text: "text-brand-600" },
  { id: "later", label: "Later", blurb: "Bigger moves, when the time is right.", icon: TreeDeciduous, size: "size-7", dot: "bg-warning-soft text-warning", text: "text-warning" },
];

const isBigWin = (s: PlanStep) => /big win/i.test(s.title);

function StepItem({ step }: { step: PlanStep }) {
  const bigWin = isBigWin(step);
  const Icon = bigWin ? Trophy : STEP_ICONS[step.kind];
  return (
    <li className={cn("flex gap-3 rounded-2xl bg-card p-4 shadow-card", bigWin && "ring-2 ring-brand-400")}>
      <Icon className={cn("size-6 shrink-0", bigWin ? "text-brand-700" : "text-brand-600")} aria-hidden />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
          <span className="text-body font-semibold">{step.title}</span>
          <span className="flex items-center gap-1 text-caption text-muted-foreground">
            <Calendar className="size-4" aria-hidden />
            {whenLabel(step.startMonth)}
          </span>
        </div>
        <span className="text-small text-muted-foreground">{step.detail}</span>
      </div>
    </li>
  );
}

function Milestones({ matches }: { matches: Match[] }) {
  const events = [
    ...new Set(matches.flatMap((m) => (m.unlockTrigger?.kind === "life_event" ? [m.unlockTrigger.event] : []))),
  ];
  if (events.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {events.map((e) => (
        <span key={e} className="flex items-center gap-1 rounded-full bg-warning-soft px-3 py-1 text-small text-warning">
          <Flag className="size-5" aria-hidden />
          Milestone: {LIFE_EVENTS[e]}
        </span>
      ))}
    </div>
  );
}

export function Roadmap({ plan }: { plan: Plan }) {
  const steps = plan.steps.filter((s) => !(s.order === plan.stepOne.order && s.title === plan.stepOne.title));
  const stages = STAGES.map((s) => ({
    ...s,
    steps: steps.filter((x) => x.stage === s.id),
    matches: plan.matches.filter((m) => m.stage === s.id),
  })).filter((s) => s.id === "now" || s.steps.length > 0 || s.matches.length > 0);

  return (
    <section aria-labelledby="roadmap" className="flex flex-col gap-6">
      <h2 id="roadmap" className="text-lead font-semibold">
        Your roadmap
      </h2>
      <ol className="flex flex-col">
        {stages.map((s, i) => (
          <li key={s.id} className="flex gap-4">
            <div className="flex flex-col items-center" aria-hidden>
              <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-full", s.dot)}>
                <s.icon className={s.size} />
              </span>
              {i < stages.length - 1 && <span className="my-2 w-0.5 flex-1 rounded-full bg-border" />}
            </div>
            <div className={cn("flex min-w-0 flex-1 flex-col gap-4", i < stages.length - 1 && "pb-12")}>
              <div className="flex flex-col pt-1">
                <h3 className={cn("text-body font-semibold", s.text)}>{s.label}</h3>
                <span className="text-small text-muted-foreground">{s.blurb}</span>
              </div>
              {s.id === "now" && <StepOneCard step={plan.stepOne} />}
              {s.id === "later" && <Milestones matches={s.matches} />}
              {s.steps.length > 0 && (
                <ul className="flex flex-col gap-4">
                  {s.steps.map((step) => (
                    <StepItem key={step.order} step={step} />
                  ))}
                </ul>
              )}
              {s.matches.length > 0 && (
                <div className="grid gap-4 md:grid-cols-2">
                  {s.matches.map((m) => (
                    <MatchCard key={`${m.productId}-${m.goalId}`} match={m} />
                  ))}
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
