import {
  BookOpen,
  Calculator,
  DoorOpen,
  Flag,
  Hourglass,
  MessageCircle,
  PiggyBank,
  Repeat,
  Shrub,
  Sprout,
  Trophy,
  TreeDeciduous,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Match, Plan, PlanStep, Stage, StepKind } from "@/types";
import { LIFE_EVENTS, whenLabel } from "./format";
import { MatchCard } from "./MatchCard";

export const STEP_ICONS: Record<StepKind, LucideIcon> = {
  save: PiggyBank,
  open: DoorOpen,
  learn: BookOpen,
  habit: Repeat,
  budget: Calculator,
  talk_to_banker: MessageCircle,
  wait: Hourglass,
};

const STAGES: { id: Stage; label: string; blurb: string; icon: LucideIcon; size: string; tone: string }[] = [
  { id: "now", label: "Start here", blurb: "Things you can do now.", icon: Sprout, size: "size-5", tone: "text-stage-now" },
  { id: "next", label: "Next", blurb: "Once the basics are set.", icon: Shrub, size: "size-6", tone: "text-stage-next" },
  { id: "later", label: "Later", blurb: "Bigger moves, when the time is right.", icon: TreeDeciduous, size: "size-7", tone: "text-muted-foreground" },
];

const isBigWin = (s: PlanStep) => /big win/i.test(s.title);

function StepItem({ step }: { step: PlanStep }) {
  const Icon = isBigWin(step) ? Trophy : STEP_ICONS[step.kind];
  return (
    <li
      className={cn(
        "flex gap-3 rounded-xl p-3",
        isBigWin(step) ? "border-2 border-primary bg-secondary" : "bg-muted",
      )}
    >
      <Icon className="mt-0.5 size-5 shrink-0 text-highlight" aria-hidden />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <span className="font-medium">{step.title}</span>
          <span className="text-xs text-muted-foreground">{whenLabel(step.startMonth)}</span>
        </div>
        <span className="text-sm leading-relaxed text-muted-foreground">{step.detail}</span>
      </div>
    </li>
  );
}

function Milestones({ matches }: { matches: Match[] }) {
  const events = [
    ...new Set(
      matches.flatMap((m) => (m.unlockTrigger?.kind === "life_event" ? [m.unlockTrigger.event] : [])),
    ),
  ];
  if (events.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {events.map((e) => (
        <span key={e} className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-sm">
          <Flag className="size-3.5 text-highlight" aria-hidden />
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
  })).filter((s) => s.steps.length > 0 || s.matches.length > 0);

  return (
    <section aria-labelledby="roadmap" className="flex flex-col gap-4">
      <h2 id="roadmap" className="text-lg font-semibold tracking-tight">
        Your roadmap
      </h2>
      <ol className="flex flex-col">
        {stages.map((s, i) => (
          <li key={s.id} className="flex gap-4">
            <div className="flex flex-col items-center" aria-hidden>
              <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary", s.tone)}>
                <s.icon className={s.size} />
              </span>
              {i < stages.length - 1 && <span className="my-1 w-0.5 flex-1 rounded-full bg-border" />}
            </div>
            <div className={cn("flex min-w-0 flex-1 flex-col gap-3", i < stages.length - 1 && "pb-8")}>
              <div className="flex flex-col pt-1.5">
                <h3 className="font-semibold">{s.label}</h3>
                <span className="text-sm text-muted-foreground">{s.blurb}</span>
              </div>
              {s.id === "later" && <Milestones matches={s.matches} />}
              {s.steps.length > 0 && (
                <ul className="flex flex-col gap-2">
                  {s.steps.map((step) => (
                    <StepItem key={step.order} step={step} />
                  ))}
                </ul>
              )}
              {s.matches.length > 0 && (
                <div className="grid gap-3 md:grid-cols-2">
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
