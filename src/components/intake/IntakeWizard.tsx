"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Compass, Heart, Sparkles, Target } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { SproutSays } from "@/components/sprout/SproutSays";
import { jordan, maya, type DemoPersona } from "@/data/personas";
import { SWIPE_CARDS } from "@/data/swipeCards";
import { useAppState } from "@/lib/client/state";
import { cn } from "@/lib/utils";
import type { GoalId } from "@/types";
import { goalMeta } from "./copy";
import { EMPTY_DRAFT, deriveValues, draftFromIntake, intakeFromDraft, type IntakeDraft } from "./draft";
import { GoalTimeline } from "./GoalTimeline";
import { SwipeDeck } from "./SwipeDeck";
import { FinishSummary, GoalsStep, LifeStageStep, PersonaReveal, RichLifeStep, WhyStep } from "./steps";

const STEPS = ["intro", "lifeStage", "swipes", "persona", "goals", "timeline", "why", "richLife", "finish"] as const;
type Step = (typeof STEPS)[number];

const INTRO_ITEMS = [
  { icon: Compass, label: "Where you are in life", detail: "Student, first job, or growing a family." },
  { icon: Heart, label: "A few quick gut checks", detail: "Pick what sounds like you. No wrong answers." },
  { icon: Target, label: "Your goals, and when", detail: "Up to three, from a trip to a first home." },
  { icon: Sparkles, label: "What a rich life means to you", detail: "Optional, in your own words." },
] as const;

function IntroStep() {
  return (
    <ol className="grid gap-4 sm:grid-cols-2" aria-label="What we'll cover">
      {INTRO_ITEMS.map(({ icon: Icon, label, detail }, i) => (
        <li key={label} className="flex items-center gap-4 rounded-2xl bg-card p-4 shadow-card lg:flex-col lg:items-start lg:gap-4 lg:p-6">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700 lg:size-12">
            <Icon className="size-5 lg:size-6" aria-hidden />
          </span>
          <span className="flex flex-col gap-1">
            <span className="text-caption font-semibold tracking-wide text-muted-foreground uppercase">Part {i + 1}</span>
            <span className="text-body font-semibold lg:text-lead">{label}</span>
            <span className="hidden text-small text-muted-foreground lg:block">{detail}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

const SPROUT_LINES: Record<Step, string> = {
  intro: "Hi, I'm Sprout. Most banks start with your credit score. I'd rather start with your life. Takes about a minute.",
  lifeStage: "First, where are you in life right now?",
  swipes: "Quick gut checks. Pick the one that sounds more like you. There are no wrong answers.",
  persona: "Here's what I'm hearing from you.",
  goals: "What are you working toward? Pick up to three.",
  timeline: "When would you like each one? Put the most important goal on top.",
  why: "What's behind each goal? It helps me make the plan feel like yours.",
  richLife: "Last one, and it's optional. What does your rich life look like?",
  finish: "Nice. Want me to save this so I can build your plan?",
};

export function IntakeWizard() {
  const router = useRouter();
  const [app, update] = useAppState();
  const [draft, setDraft] = useState<IntakeDraft>(() =>
    app.intake ? draftFromIntake(app.intake) : EMPTY_DRAFT,
  );
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const stepRef = useRef<HTMLDivElement>(null);
  const step = STEPS[stepIndex];
  const values = deriveValues(draft.swipes);

  useEffect(() => {
    stepRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }, [stepIndex]);

  const goTo = (s: Step) => setStepIndex(STEPS.indexOf(s));
  const next = () => setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  const back = () => setStepIndex((i) => Math.max(i - 1, 0));

  const canContinue: Record<Step, boolean> = {
    intro: true,
    lifeStage: !!draft.lifeStage,
    swipes: draft.swipes.length === SWIPE_CARDS.length,
    persona: true,
    goals: draft.goals.length >= 1,
    timeline: true,
    why: true,
    richLife: true,
    finish: true,
  };

  function toggleGoal(id: GoalId) {
    setDraft((d) => ({
      ...d,
      goals: d.goals.some((g) => g.id === id)
        ? d.goals.filter((g) => g.id !== id)
        : [...d.goals, { id, horizonMonths: goalMeta(id).defaultMonths, whyText: "" }],
    }));
  }

  function applyPersona(p: DemoPersona) {
    setDraft(draftFromIntake(p.intake));
    setError(null);
    goTo("persona");
  }

  function save() {
    const result = intakeFromDraft(draft);
    if (!result.success) {
      setError("Something's missing. Go back and check your goals.");
      return;
    }
    update({ intake: result.data, profile: undefined, plan: undefined });
    router.push("/snapshot");
  }

  // Desktop (lg+): a pinned left column (progress, Sprout's line) beside a wide step area.
  // Phones keep the single column: progress, Sprout, step, buttons.
  return (
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[20rem_minmax(0,1fr)] lg:items-start lg:gap-x-12">
      <aside className="flex flex-col gap-6 lg:sticky lg:top-24">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-end gap-3 text-xs text-muted-foreground lg:justify-start">
            <span className="flex items-center gap-1.5">
              Demo:
              {[maya, jordan].map((p) => (
                <Button key={p.id} variant="outline" size="xs" onClick={() => applyPersona(p)}>
                  Use {p.name}
                </Button>
              ))}
            </span>
          </div>
          <Progress value={(stepIndex / (STEPS.length - 1)) * 100} aria-label="Intake progress" />
          <span className="hidden text-caption font-semibold tracking-wide text-muted-foreground uppercase lg:block">
            Step {stepIndex + 1} of {STEPS.length}
          </span>
        </div>
        <div id="sprout-line">
          <SproutSays>{SPROUT_LINES[step]}</SproutSays>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col gap-6">
        <div ref={stepRef} tabIndex={-1} role="group" aria-labelledby="sprout-line" className="flex flex-col gap-6 outline-none">
          {step === "intro" && <IntroStep />}
          {step === "lifeStage" && (
            <LifeStageStep
              value={draft.lifeStage}
              onPick={(lifeStage) => {
                setDraft((d) => ({ ...d, lifeStage }));
                next();
              }}
            />
          )}
          {step === "swipes" && (
            <SwipeDeck
              cards={SWIPE_CARDS}
              answers={draft.swipes}
              onAnswer={(choice) => {
                const card = SWIPE_CARDS[draft.swipes.length];
                if (!card) return;
                const swipes = [...draft.swipes, { cardId: card.id, choice }];
                setDraft((d) => ({ ...d, swipes }));
                if (swipes.length === SWIPE_CARDS.length) next();
              }}
              onUndo={() => setDraft((d) => ({ ...d, swipes: d.swipes.slice(0, -1) }))}
            />
          )}
          {step === "persona" && <PersonaReveal values={values} />}
          {step === "goals" && <GoalsStep selected={draft.goals.map((g) => g.id)} onToggle={toggleGoal} />}
          {step === "timeline" && (
            <GoalTimeline goals={draft.goals} onChange={(goals) => setDraft((d) => ({ ...d, goals }))} />
          )}
          {step === "why" && <WhyStep goals={draft.goals} onChange={(goals) => setDraft((d) => ({ ...d, goals }))} />}
          {step === "richLife" && (
            <RichLifeStep
              value={draft.richLifeText}
              onChange={(richLifeText) => setDraft((d) => ({ ...d, richLifeText }))}
            />
          )}
          {step === "finish" && <FinishSummary values={values} goals={draft.goals} />}

          {error && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {error}
            </p>
          )}
        </div>

        <div className="sticky bottom-0 -mx-4 flex gap-3 border-t border-border bg-background/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0">
          {stepIndex === 0 ? (
            <Link href="/" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-12 px-4")}>
              <ArrowLeft aria-hidden />
              Back
            </Link>
          ) : (
            <Button variant="outline" size="lg" className="h-12 px-4" onClick={back}>
              <ArrowLeft aria-hidden />
              Back
            </Button>
          )}
          <Button
            size="lg"
            className="h-12 flex-1 text-base font-semibold sm:flex-none sm:px-8"
            disabled={!canContinue[step]}
            onClick={step === "finish" ? save : next}
          >
            <span className="inline-flex items-center gap-2">
              {step === "intro" ? "Let's go" : step === "finish" ? "Save and continue" : "Next"}
              <ArrowRight aria-hidden />
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
}
