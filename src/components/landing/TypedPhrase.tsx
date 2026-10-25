"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

// Landing headline (#85): each phrase holds, deletes letter by letter, then the next types out.
// Every phrase is followed on the page by "Sprout starts with your life."
export const PHRASES = [
  "Most banks start with your credit score.",
  "Budget apps start with what you spent.",
  "Loan applications start with your income.",
  "Most money advice starts with a spreadsheet.",
  "Money tips start with what you're doing wrong.",
];

const HOLD_MS = 4000;
const DELETE_MS = 28;
const TYPE_MS = 55;
const GAP_MS = 350;

type Phase = "hold" | "delete" | "type";

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia("(prefers-reduced-motion: reduce)");
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

// Decorative: the h1 carries the static sentence for screen readers, so this is aria-hidden.
export function TypedPhrase() {
  const reduceMotion = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState(PHRASES[0].length);
  const [phase, setPhase] = useState<Phase>("hold");
  const phrase = PHRASES[index];

  useEffect(() => {
    if (reduceMotion) return;
    let timer: ReturnType<typeof setTimeout>;
    if (phase === "hold") {
      timer = setTimeout(() => setPhase("delete"), HOLD_MS);
    } else if (phase === "delete") {
      timer =
        shown > 0
          ? setTimeout(() => setShown((n) => n - 1), DELETE_MS)
          : setTimeout(() => {
              setIndex((i) => (i + 1) % PHRASES.length);
              setPhase("type");
            }, GAP_MS);
    } else {
      timer =
        shown < phrase.length
          ? setTimeout(() => setShown((n) => n + 1), TYPE_MS)
          : setTimeout(() => setPhase("hold"), 0);
    }
    return () => clearTimeout(timer);
  }, [phase, shown, phrase, reduceMotion]);

  const text = reduceMotion ? PHRASES[0] : phrase.slice(0, shown);

  return (
    // Every phrase sits invisibly in the same grid cell, so the line keeps the height of the
    // longest one and nothing below jumps while it types.
    <span aria-hidden className="grid">
      {PHRASES.map((p) => (
        <span key={p} className="invisible col-start-1 row-start-1">
          {p}
        </span>
      ))}
      <span className="col-start-1 row-start-1">
        {reduceMotion ? (
          text
        ) : (
          <>
            {text.slice(0, -1)}
            {/* The last letter and the cursor wrap together, so the cursor never sits alone on a line. */}
            <span className="whitespace-nowrap">
              {text.slice(-1)}
              {/* Zero-width wrapper so the cursor never changes where the text wraps. */}
              <span className="relative inline-block h-[0.9em] w-0 align-[-0.12em]">
                <span
                  className={`absolute inset-y-0 left-1 w-[3px] rounded-full bg-brand-700 ${
                    phase === "hold" ? "animate-caret-blink" : ""
                  }`}
                />
              </span>
            </span>
          </>
        )}
      </span>
    </span>
  );
}
