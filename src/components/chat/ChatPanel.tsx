"use client";

// "Ask Sprout" panel on /plan (#12): suggested chips + free text -> POST /api/chat via askSprout.
// Answers come from the server's grounded chat (engine math for what-ifs, catalog rates, advice
// boundary); this component only renders them. Cited products jump to their match cards.
import { useEffect, useRef, useState } from "react";
import { ArrowDown, MessageCircleQuestion, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SproutAvatar } from "@/components/sprout/SproutAvatar";
import { SproutSays } from "@/components/sprout/SproutSays";
import { productName } from "@/components/plan/format";
import { ApiError, askSprout } from "@/lib/client/api";
import type { GoalProfile, Plan } from "@/types";

const CHIPS = ["Why this first?", "What if I save $50 more?", "When can I get a credit card?"];
const MAX_QUESTION_CHARS = 500; // same limit as /api/chat
const DISCLAIMER = "Educational prototype. Not financial advice. Nothing is stored unless you choose to share it with FNB.";

type Turn =
  | { id: number; question: string; status: "pending" }
  | { id: number; question: string; status: "done"; answer: string; cited: string[] }
  | { id: number; question: string; status: "error"; message: string };

// Match cards render their product name in an <h4>; find that card, else fall back to the roadmap.
function jumpToProduct(id: string) {
  const name = productName(id);
  const card = [...document.querySelectorAll("article h4")].find((h) => h.textContent === name)?.closest("article");
  const target = card ?? document.getElementById("roadmap");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  target?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
}

export function ChatPanel({ plan, profile }: { plan: Plan; profile: GoalProfile }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const nextId = useRef(1);
  const openButton = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const busy = turns.some((t) => t.status === "pending");

  // Focus moves into the panel on open and back to the launcher on close (button, Esc).
  const wasOpen = useRef(false);
  useEffect(() => {
    if (!open) {
      if (wasOpen.current) openButton.current?.focus();
      wasOpen.current = false;
      return;
    }
    wasOpen.current = true;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [turns, open]);

  async function ask(raw: string, retryId?: number) {
    const question = raw.trim().slice(0, MAX_QUESTION_CHARS);
    if (!question || busy) return;
    const id = retryId ?? nextId.current++;
    setTurns((prev) =>
      retryId
        ? prev.map((t) => (t.id === id ? { id, question, status: "pending" } : t))
        : [...prev, { id, question, status: "pending" }],
    );
    setDraft("");
    try {
      const { answer, citedProductIds } = await askSprout(question, profile, plan);
      setTurns((prev) => prev.map((t) => (t.id === id ? { id, question, status: "done", answer, cited: citedProductIds } : t)));
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return; // redirecting to login
      const message = error instanceof ApiError ? error.message : "Sprout couldn't answer that. Try again.";
      setTurns((prev) => prev.map((t) => (t.id === id ? { id, question, status: "error", message } : t)));
    }
  }

  return (
    <>
      {!open && (
        <button
          ref={openButton}
          type="button"
          onClick={() => setOpen(true)}
          className="fixed right-4 bottom-4 z-50 inline-flex h-12 animate-in items-center gap-2 rounded-full bg-highlight px-5 text-body font-semibold text-highlight-foreground shadow-raised outline-none transition-[background-color,box-shadow,transform] duration-200 fade-in slide-in-from-bottom-4 select-none hover:bg-highlight/90 focus-visible:ring-4 focus-visible:ring-brand-400/60 active:translate-y-px active:bg-highlight/80 motion-reduce:animate-none motion-reduce:transition-none sm:right-6 sm:bottom-6"
        >
          <MessageCircleQuestion className="size-6" aria-hidden /> Ask Sprout
        </button>
      )}

      {open && (
        <section
          role="dialog"
          aria-modal="false"
          aria-labelledby="ask-sprout-title"
          className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] animate-in flex-col rounded-t-2xl bg-card shadow-raised duration-200 fade-in slide-in-from-bottom-4 motion-reduce:animate-none sm:inset-x-auto sm:top-20 sm:right-6 sm:bottom-6 sm:max-h-none sm:w-[24rem] sm:rounded-2xl"
        >
          <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
            <h2 id="ask-sprout-title" className="flex items-center gap-2 text-body font-semibold">
              <SproutAvatar size="sm" /> Ask Sprout why or what if
            </h2>
            <Button type="button" variant="ghost" size="icon-sm" aria-label="Close Ask Sprout" onClick={() => setOpen(false)}>
              <X aria-hidden />
            </Button>
          </header>

          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4" aria-live="polite">
            <SproutSays>Ask me why something is in your plan, or try a what-if. I&apos;ll use your real numbers.</SproutSays>

            {turns.map((t) => (
              <div key={t.id} className="flex flex-col gap-2">
                <p className="max-w-[85%] self-end rounded-2xl rounded-tr-sm bg-highlight px-4 py-2 text-small text-highlight-foreground">{t.question}</p>
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
                            onClick={() => jumpToProduct(id)}
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
                    <Button type="button" variant="outline" size="xs" onClick={() => void ask(t.question, t.id)} disabled={busy}>
                      Try again
                    </Button>
                  </div>
                )}
              </div>
            ))}
            <div ref={endRef} />
          </div>

          <div className="flex flex-col gap-3 border-t border-border px-4 py-3">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Suggested questions">
              {CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  disabled={busy}
                  onClick={() => void ask(chip)}
                  className="rounded-full bg-brand-50 px-3 py-1 text-small font-medium text-brand-700 ring-1 ring-brand-200 outline-none transition-colors duration-200 ring-inset hover:bg-brand-100 focus-visible:ring-4 focus-visible:ring-ring/30 active:bg-brand-200 disabled:pointer-events-none disabled:opacity-50"
                >
                  {chip}
                </button>
              ))}
            </div>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void ask(draft);
              }}
            >
              <Input
                ref={inputRef}
                value={draft}
                maxLength={MAX_QUESTION_CHARS}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Ask about your plan"
                aria-label="Ask Sprout a question"
                className="h-10"
              />
              <Button type="submit" size="icon" className="size-10 shrink-0" disabled={busy || !draft.trim()} aria-label="Send question">
                <Send aria-hidden />
              </Button>
            </form>
            <p className="text-center text-caption text-muted-foreground">{DISCLAIMER}</p>
          </div>
        </section>
      )}
    </>
  );
}
