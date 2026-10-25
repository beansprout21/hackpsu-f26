"use client";

// Ask Sprout (#12, made the dashboard's centerpiece in #58): one shared thread behind several entry
// points: a docked panel on desktop, a card + bottom sheet on phones, and AskChip buttons across the
// plan. Answers come from the server's grounded chat (POST /api/chat via askSprout); this file only
// renders them. Cited products call onCite so the dashboard can open the right tab and row.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { ArrowDown, MessageCircleQuestion, Send, Sparkles, X } from "lucide-react";
import { SproutAvatar } from "@/components/sprout/SproutAvatar";
import { SproutSays } from "@/components/sprout/SproutSays";
import { productName } from "@/components/plan/format";
import { ApiError, askSprout } from "@/lib/client/api";
import { cn } from "@/lib/utils";
import type { GoalProfile, Plan } from "@/types";

const CHIPS = ["Why this first?", "What if I save $50 more?", "When can I get a credit card?"];
const MAX_QUESTION_CHARS = 500; // same limit as /api/chat
const DISCLAIMER = "Educational prototype. Not financial advice. Nothing is stored unless you choose to share it with FNB.";
const DESKTOP_QUERY = "(min-width: 1024px)";

type Turn =
  | { id: number; question: string; status: "pending" }
  | { id: number; question: string; status: "done"; answer: string; cited: string[] }
  | { id: number; question: string; status: "error"; message: string };

type AskSproutState = {
  intro: string;
  turns: Turn[];
  busy: boolean;
  isDesktop: boolean;
  sheetOpen: boolean;
  setSheetOpen: (open: boolean) => void;
  ask: (question: string, retryId?: number) => Promise<void>;
  cite: (productId: string) => void;
};

const AskSproutContext = createContext<AskSproutState | null>(null);

function useAskSprout() {
  const ctx = useContext(AskSproutContext);
  if (!ctx) throw new Error("useAskSprout must be used inside <AskSproutProvider>");
  return ctx;
}

function useIsDesktop() {
  return useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia(DESKTOP_QUERY);
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    },
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => false,
  );
}

export function AskSproutProvider({
  plan,
  profile,
  onCite,
  children,
}: {
  plan: Plan;
  profile: GoalProfile;
  onCite: (productId: string) => void;
  children: ReactNode;
}) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const nextId = useRef(1);
  const isDesktop = useIsDesktop();
  const busy = turns.some((t) => t.status === "pending");

  const ask = useCallback(
    async (raw: string, retryId?: number) => {
      const question = raw.trim().slice(0, MAX_QUESTION_CHARS);
      if (!question || busy) return;
      if (!isDesktop) setSheetOpen(true);
      const id = retryId ?? nextId.current++;
      setTurns((prev) =>
        retryId
          ? prev.map((t) => (t.id === id ? { id, question, status: "pending" } : t))
          : [...prev, { id, question, status: "pending" }],
      );
      try {
        const { answer, citedProductIds } = await askSprout(question, profile, plan);
        setTurns((prev) =>
          prev.map((t) => (t.id === id ? { id, question, status: "done", answer, cited: citedProductIds } : t)),
        );
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return; // redirecting to login
        const message = error instanceof ApiError ? error.message : "Sprout couldn't answer that. Try again.";
        setTurns((prev) => prev.map((t) => (t.id === id ? { id, question, status: "error", message } : t)));
      }
    },
    [busy, isDesktop, plan, profile],
  );

  const cite = useCallback(
    (productId: string) => {
      setSheetOpen(false);
      onCite(productId);
    },
    [onCite],
  );

  const value = useMemo(
    () => ({ intro: plan.sproutSays, turns, busy, isDesktop, sheetOpen, setSheetOpen, ask, cite }),
    [plan.sproutSays, turns, busy, isDesktop, sheetOpen, ask, cite],
  );
  return <AskSproutContext.Provider value={value}>{children}</AskSproutContext.Provider>;
}

// A ready-made question placed next to the thing it asks about (goal, stage, product).
export function AskChip({ question, className }: { question: string; className?: string }) {
  const { ask, busy } = useAskSprout();
  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => void ask(question)}
      className={cn(
        "inline-flex items-center gap-1 self-start rounded-full bg-highlight/10 px-3 py-1 text-left text-small font-medium text-highlight outline-none transition-colors duration-200 hover:bg-highlight/20 focus-visible:ring-4 focus-visible:ring-ring/30 active:bg-highlight/25 disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
    >
      <Sparkles className="size-4 shrink-0" aria-hidden />
      {question}
    </button>
  );
}

function PanelHeader({ onClose }: { onClose?: () => void }) {
  return (
    <header className="flex items-center gap-3 bg-highlight px-4 py-3 text-highlight-foreground">
      <SproutAvatar size="sm" />
      <div className="flex min-w-0 flex-1 flex-col">
        <h2 id="ask-sprout-title" className="flex items-center gap-2 text-body font-semibold">
          Ask Sprout
          <span className="rounded-full bg-white/15 px-2 text-caption font-semibold">AI</span>
        </h2>
        <span className="text-caption text-white/80">Why or what if, using your real numbers</span>
      </div>
      {onClose && (
        <button
          type="button"
          aria-label="Close Ask Sprout"
          onClick={onClose}
          className="inline-flex size-10 items-center justify-center rounded-full outline-none transition-colors hover:bg-white/15 focus-visible:ring-4 focus-visible:ring-white/40"
        >
          <X className="size-5" aria-hidden />
        </button>
      )}
    </header>
  );
}

function Thread({ autoFocus = false }: { autoFocus?: boolean }) {
  const { intro, turns, busy, ask, cite } = useAskSprout();
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  // Scroll the thread itself (not the page) to the newest message.
  useEffect(() => {
    const el = scrollRef.current;
    if (el && turns.length > 0) el.scrollTop = el.scrollHeight;
  }, [turns]);

  return (
    <>
      <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4" aria-live="polite">
        <SproutSays>{intro}</SproutSays>
        <SproutSays>Ask me why something is in your plan, or try a what-if.</SproutSays>

        {turns.map((t) => (
          <div key={t.id} className="flex flex-col gap-2">
            <p className="max-w-[85%] self-end rounded-2xl rounded-tr-sm bg-highlight px-4 py-2 text-small text-highlight-foreground">
              {t.question}
            </p>
            {t.status === "pending" && (
              <div className="flex items-center gap-2 text-small text-muted-foreground motion-safe:animate-pulse">
                <SproutAvatar mood="thinking" size="sm" /> Sprout is thinking...
              </div>
            )}
            {t.status === "done" && (
              <div className="flex flex-col gap-2">
                <SproutSays>{t.answer}</SproutSays>
                {t.cited.length > 0 && (
                  <div className="flex flex-wrap gap-2 pl-14">
                    {t.cited.map((id) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => cite(id)}
                        className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-3 py-1 text-caption font-semibold text-brand-700 outline-none transition-colors duration-200 hover:bg-brand-200 focus-visible:ring-4 focus-visible:ring-ring/30"
                      >
                        <ArrowDown className="size-4" aria-hidden />
                        {productName(id)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {t.status === "error" && (
              <div role="alert" className="flex flex-wrap items-center gap-2 rounded-xl bg-danger-soft px-4 py-3 text-small text-danger">
                <span>{t.message}</span>
                <button
                  type="button"
                  onClick={() => void ask(t.question, t.id)}
                  disabled={busy}
                  className="rounded-full bg-card px-3 py-1 text-caption font-semibold text-foreground shadow-card disabled:opacity-50"
                >
                  Try again
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 border-t border-border px-4 py-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Suggested questions">
          {CHIPS.map((chip) => (
            <AskChip key={chip} question={chip} />
          ))}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void ask(draft);
            setDraft("");
          }}
        >
          <input
            ref={inputRef}
            value={draft}
            maxLength={MAX_QUESTION_CHARS}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask about your plan"
            aria-label="Ask Sprout a question"
            className="h-12 min-w-0 flex-1 rounded-xl bg-muted px-4 text-body outline-none transition-shadow placeholder:text-muted-foreground focus-visible:ring-4 focus-visible:ring-ring/30"
          />
          <button
            type="submit"
            disabled={busy || !draft.trim()}
            aria-label="Send question"
            className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-highlight text-highlight-foreground outline-none transition-colors hover:bg-highlight/90 focus-visible:ring-4 focus-visible:ring-ring/30 active:bg-highlight/80 disabled:opacity-40"
          >
            <Send className="size-5" aria-hidden />
          </button>
        </form>
        <p className="text-center text-caption text-muted-foreground">{DISCLAIMER}</p>
      </div>
    </>
  );
}

// Desktop: always-open panel docked beside the dashboard.
export function SproutCopilot() {
  const { isDesktop } = useAskSprout();
  if (!isDesktop) return null;
  return (
    <aside
      aria-labelledby="ask-sprout-title"
      className="sticky top-24 flex h-[calc(100dvh-7rem)] flex-col overflow-hidden rounded-2xl bg-card shadow-raised"
    >
      <PanelHeader />
      <Thread />
    </aside>
  );
}

// Phones and tablets: a card near the top of the plan, a floating launcher, and a bottom sheet.
export function AskSproutMobile() {
  const { isDesktop, intro, sheetOpen, setSheetOpen } = useAskSprout();
  const launcher = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (!sheetOpen) {
      if (wasOpen.current) launcher.current?.focus();
      wasOpen.current = false;
      return;
    }
    wasOpen.current = true;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSheetOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheetOpen, setSheetOpen]);

  if (isDesktop) return null;
  return (
    <>
      <section aria-labelledby="ask-sprout-card" className="flex flex-col gap-4 rounded-2xl bg-highlight p-4 text-highlight-foreground shadow-raised">
        <div className="flex items-start gap-3">
          <SproutAvatar />
          <div className="flex min-w-0 flex-col gap-1">
            <h2 id="ask-sprout-card" className="flex items-center gap-2 text-body font-semibold">
              Ask Sprout
              <span className="rounded-full bg-white/15 px-2 text-caption font-semibold">AI</span>
            </h2>
            <p className="line-clamp-3 text-small text-white/90">{intro}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="flex h-12 items-center gap-2 rounded-xl bg-card px-4 text-left text-body text-muted-foreground outline-none transition-shadow focus-visible:ring-4 focus-visible:ring-white/40"
        >
          <MessageCircleQuestion className="size-6 text-highlight" aria-hidden />
          Ask why or what if
        </button>
      </section>

      {!sheetOpen && (
        <button
          ref={launcher}
          type="button"
          onClick={() => setSheetOpen(true)}
          className="fixed right-4 bottom-4 z-50 inline-flex h-12 animate-in items-center gap-2 rounded-full bg-highlight px-5 text-body font-semibold text-highlight-foreground shadow-raised outline-none transition-[background-color,transform] duration-200 fade-in slide-in-from-bottom-4 hover:bg-highlight/90 focus-visible:ring-4 focus-visible:ring-brand-400/60 active:translate-y-px motion-reduce:animate-none"
        >
          <MessageCircleQuestion className="size-6" aria-hidden /> Ask Sprout
        </button>
      )}

      {sheetOpen && (
        <section
          role="dialog"
          aria-modal="false"
          aria-labelledby="ask-sprout-title"
          className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] animate-in flex-col overflow-hidden rounded-t-2xl bg-card shadow-raised duration-200 fade-in slide-in-from-bottom-4 motion-reduce:animate-none"
        >
          <PanelHeader onClose={() => setSheetOpen(false)} />
          <Thread autoFocus />
        </section>
      )}
    </>
  );
}
