"use client";

// "Share my plan with FNB" (#53, Contracts v2.2): opt-in, consent text v1 verbatim, stored 30 days,
// "Stop sharing" deletes it. The server takes name and email from the Auth0 session.
import { useCallback, useEffect, useId, useState } from "react";
import { Building2, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiError, getShareStatus, sharePlan, stopSharing } from "@/lib/client/api";
import { useAppState } from "@/lib/client/state";
import type { GoalProfile, Plan, ShareStatus } from "@/types";

const UNAVAILABLE = "Sharing is unavailable right now";

type View =
  | { kind: "loading" }
  | { kind: "unavailable" }
  | { kind: "ready"; status: ShareStatus }
  | { kind: "error"; message: string; retry: () => void };

const formatDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "";

const messageOf = (error: unknown) =>
  error instanceof ApiError ? error.message : "Something went wrong on our side. Try again.";

export function SharePlanCard({ plan, profile }: { plan: Plan; profile: GoalProfile }) {
  const [app] = useAppState();
  const { intake, snapshot } = app;
  const [view, setView] = useState<View>({ kind: "loading" });
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const checkboxId = useId();

  const load = useCallback(async () => {
    setView({ kind: "loading" });
    try {
      setView({ kind: "ready", status: await getShareStatus() });
    } catch (error) {
      if (error instanceof ApiError && error.message === UNAVAILABLE) setView({ kind: "unavailable" });
      else setView({ kind: "error", message: messageOf(error), retry: () => void load() });
    }
  }, []);

  useEffect(() => {
    if (!intake || !snapshot) return; // demo mocks (/plan?mock=) have nothing to share
    void load();
  }, [intake, snapshot, load]);

  async function run(action: () => Promise<ShareStatus>) {
    setBusy(true);
    try {
      setView({ kind: "ready", status: await action() });
      setAgreed(false);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return; // redirecting to login
      if (error instanceof ApiError && error.message === UNAVAILABLE) setView({ kind: "unavailable" });
      else setView({ kind: "error", message: messageOf(error), retry: () => void run(action) });
    } finally {
      setBusy(false);
    }
  }

  const share = () => {
    if (!intake || !snapshot) return;
    void run(() => sharePlan({ intake, snapshot, profile, plan }));
  };

  const shown: View = !intake || !snapshot ? { kind: "unavailable" } : view;

  return (
    <section aria-labelledby="share-fnb" className="flex flex-col gap-4 rounded-2xl bg-card p-6 shadow-card">
      <h2 id="share-fnb" className="flex items-center gap-2 text-lead font-semibold">
        <Building2 className="size-7 text-primary" aria-hidden />
        Share my plan with FNB
      </h2>

      {shown.kind === "loading" && (
        <p className="flex items-center gap-2 text-small text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden /> Checking your sharing status...
        </p>
      )}

      {shown.kind === "unavailable" && <p className="text-small text-muted-foreground">{UNAVAILABLE}.</p>}

      {shown.kind === "error" && (
        <div role="alert" className="flex flex-wrap items-center gap-3 text-small">
          <span>{shown.message}</span>
          <Button type="button" variant="outline" size="sm" onClick={shown.retry} disabled={busy}>
            Try again
          </Button>
        </div>
      )}

      {shown.kind === "ready" && !shown.status.shared && (
        <div className="flex flex-col gap-4">
          <p className="text-small">
            <strong>Share my plan with FNB.</strong> An FNB banker will see your name, email, goals, money snapshot, and
            Sprout plan so they can prepare for a conversation with you. Sprout keeps it for 30 days. You can stop
            sharing anytime, which deletes it.
          </p>
          <label htmlFor={checkboxId} className="flex items-start gap-3 text-small font-medium">
            <input
              id={checkboxId}
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 size-5 shrink-0 accent-primary"
            />
            I agree to share my plan with FNB.
          </label>
          <Button type="button" size="lg" onClick={share} disabled={!agreed || busy} className="h-11 self-start px-5">
            {busy && <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden />}
            Share with FNB
          </Button>
        </div>
      )}

      {shown.kind === "ready" && shown.status.shared && (
        <div className="flex flex-col gap-4">
          <p className="text-small" role="status">
            Shared with FNB on {formatDate(shown.status.sharedAt)}. Kept until {formatDate(shown.status.expiresAt)}.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="lg" onClick={() => void run(stopSharing)} disabled={busy} className="h-11 px-5">
              Stop sharing
            </Button>
            <Button type="button" variant="ghost" size="lg" onClick={share} disabled={busy} className="h-11 px-5">
              Share my latest plan
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
