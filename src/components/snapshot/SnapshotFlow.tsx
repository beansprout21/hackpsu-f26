"use client";

// /snapshot flow: form -> profile -> plan -> /plan. Results go to the waypoint:v1 context.
import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { SproutSays } from "@/components/sprout/SproutSays";
import { jordan, maya, mayaOpposite, type DemoPersona } from "@/data/personas";
import { ApiError, getPlan, getProfile } from "@/lib/client/api";
import { useAppState } from "@/lib/client/state";
import type { GoalProfile, IntakeAnswers } from "@/types";
import { applyExtraction, draftFromSnapshot, EMPTY_DRAFT, validSnapshot, type SnapshotDraft } from "./draft";
import { DocumentUpload } from "./DocumentUpload";
import { GenerationProgress, type GenerationStage } from "./GenerationProgress";
import { SnapshotForm } from "./SnapshotForm";

type Phase = { kind: "form" } | { kind: "generating"; stage: GenerationStage } | { kind: "error"; message: string };

export function SnapshotFlow() {
  const router = useRouter();
  const [state, update] = useAppState();
  const [draft, setDraft] = useState<SnapshotDraft>(() => (state.snapshot ? draftFromSnapshot(state.snapshot) : EMPTY_DRAFT));
  const [phase, setPhase] = useState<Phase>({ kind: "form" });
  // The profile depends only on the intake, so "Try again" after a plan failure reuses it.
  const profileFor = useRef<{ intake: IntakeAnswers; profile: GoalProfile } | null>(null);

  const prefill = (p: DemoPersona) => {
    setDraft(draftFromSnapshot(p.snapshot));
    // The proof-moment persona always replaces the intake; the others fill one in only if missing.
    if (p.id === "maya-opposite" || !state.intake) update({ intake: p.intake, profile: undefined, plan: undefined });
  };

  async function generate() {
    const intake = state.intake;
    const parsed = validSnapshot(draft);
    if (!intake || !parsed.success) return;
    const snapshot = parsed.data;
    update({ snapshot });
    try {
      let profile = profileFor.current?.intake === intake ? profileFor.current.profile : undefined;
      if (!profile) {
        setPhase({ kind: "generating", stage: "profile" });
        profile = await getProfile(intake);
        profileFor.current = { intake, profile };
      }
      setPhase({ kind: "generating", stage: "plan" });
      const plan = await getPlan(profile, snapshot, intake);
      update({ profile, plan });
      router.push("/plan");
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return; // redirecting to login
      setPhase({ kind: "error", message: error instanceof ApiError ? error.message : "Something went wrong. Try again." });
    }
  }

  if (!state.intake) {
    return (
      <div className="flex flex-col gap-6">
        <SproutSays>Let&apos;s start with what you want your money to do. It takes about two minutes.</SproutSays>
        <Link href="/intake" className={buttonVariants({ size: "lg", className: "h-12 self-start" })}>
          Start with your goals
        </Link>
        <DemoPrefill onPick={prefill} />
      </div>
    );
  }

  if (phase.kind === "generating") return <GenerationProgress stage={phase.stage} />;

  return (
    <div className="flex flex-col gap-8">
      <SproutSays>
        Now the money side. Rough numbers are perfect: we&apos;ll turn them into a plan you can start this week.
      </SproutSays>
      {phase.kind === "error" && (
        <div role="alert" className="flex flex-col gap-3 rounded-2xl border-2 border-destructive/40 bg-destructive/5 p-4">
          <p className="font-medium">{phase.message}</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => void generate()}>
              Try again
            </Button>
            <Button type="button" variant="outline" onClick={() => setPhase({ kind: "form" })}>
              Edit my numbers
            </Button>
          </div>
        </div>
      )}
      <DocumentUpload onExtracted={(ex) => setDraft((d) => applyExtraction(d, ex))} />
      <SnapshotForm draft={draft} onChange={setDraft} onSubmit={() => void generate()} submitting={false} />
      <DemoPrefill onPick={prefill} />
    </div>
  );
}

// Presenter-only prefill, kept out of the way at the bottom of the page.
function DemoPrefill({ onPick }: { onPick: (p: DemoPersona) => void }) {
  return (
    <section aria-label="Demo shortcuts" className="flex flex-col gap-2 rounded-xl border border-dashed border-border p-3 text-sm">
      <p className="text-xs font-medium text-muted-foreground">Demo shortcuts</p>
      <div className="flex flex-wrap gap-2">
        {[maya, jordan, mayaOpposite].map((p) => (
          <Button key={p.id} type="button" variant="secondary" size="sm" onClick={() => onPick(p)}>
            {p.id === "maya-opposite" ? p.name : `Fill in as ${p.name}`}
          </Button>
        ))}
      </div>
    </section>
  );
}
