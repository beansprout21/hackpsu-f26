"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

// Landing headline (#85): "Sprout starts with your ___." Each word holds, deletes letter by
// letter, then the next types out. The first one is what phones and reduced motion see.
const PREFIX = "Sprout starts with your ";
export const PHRASES = ["life.", "dreams.", "goals.", "values.", "future."];

const HOLD_MS = 2500;
const DELETE_MS = 60;
const TYPE_MS = 90;
const GAP_MS = 350;

type Phase = "hold" | "delete" | "type";

function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

// Cursor: plain inline (not inline-block), so it adds no line-break opportunity mid-word.
function Caret({ blinking }: { blinking: boolean }) {
  return (
    <span className="relative">
      <span
        className={`absolute inset-y-[0.08em] left-0.5 w-[3px] rounded-full bg-brand-700 ${
          blinking ? "animate-caret-blink" : ""
        }`}
      />
    </span>
  );
}

// The full phrase is always laid out (untyped letters are transparent), so each word sits on its
// final line from the first keystroke. The cursor is glued (nowrap) to a real letter so it can't
// drift to another line: the last typed letter, or after a space the next untyped one (gluing to
// the space would remove a legal line break and change the layout).
function TypedText({ typed, rest, blinking }: { typed: string; rest: string; blinking: boolean }) {
  const last = typed.slice(-1);
  if (last && last !== " ") {
    return (
      <>
        {typed.slice(0, -1)}
        <span className="whitespace-nowrap">
          {last}
          <Caret blinking={blinking} />
        </span>
        <span className="text-transparent">{rest}</span>
      </>
    );
  }
  return (
    <>
      {typed}
      <span className="whitespace-nowrap">
        <Caret blinking={blinking} />
        <span className="text-transparent">{rest.slice(0, 1)}</span>
      </span>
      <span className="text-transparent">{rest.slice(1)}</span>
    </>
  );
}

// Decorative: the h1 carries the static sentence for screen readers, so this is aria-hidden.
export function TypedPhrase() {
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  // Phones show the static sentence instead (#180), so don't run the timers there.
  const wide = useMediaQuery("(min-width: 640px)");
  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState(PHRASES[0].length);
  const [phase, setPhase] = useState<Phase>("hold");
  const phrase = PHRASES[index];

  useEffect(() => {
    if (reduceMotion || !wide) return;
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
  }, [phase, shown, phrase, reduceMotion, wide]);

  const text = reduceMotion ? PHRASES[0] : phrase.slice(0, shown);

  return (
    // Every phrase sits invisibly in the same grid cell, so the line keeps the height of the
    // longest one and nothing below jumps while it types.
    // text-wrap (not the h1's balance): balancing can pick different breaks as the cursor moves
    // between spans, while greedy wrapping depends only on the letters, so lines never change.
    <span aria-hidden className="grid text-wrap">
      {PHRASES.map((p) => (
        <span key={p} className="invisible col-start-1 row-start-1">
          {PREFIX}
          {p}
        </span>
      ))}
      <span className="col-start-1 row-start-1">
        {PREFIX}
        {reduceMotion ? (
          text
        ) : (
          // The whole phrase is always laid out; letters not typed yet are just transparent. So every
          // word sits on its final line from the first keystroke and typing never reflows the text.
          <TypedText typed={text} rest={phrase.slice(shown)} blinking={phase === "hold"} />
        )}
      </span>
    </span>
  );
}
