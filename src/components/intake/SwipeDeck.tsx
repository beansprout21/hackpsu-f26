"use client";

import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Sprout, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SwipeAnswer, SwipeCard } from "@/types";
import { TiltCard } from "./TiltCard";

type Side = SwipeAnswer["choice"];
type Point = { x: number; y: number };

// "Clearly on that side": horizontal distance from the card's resting spot that picks a side.
const SIDE_THRESHOLD = 90;
// How close (px) the card's center must get to a box to count as "near" it.
const NEAR_MARGIN = 28;
const EDGE_PAD = 24;
const DROP_MS = 240;
// The card shrinks linearly from full size at its starting distance from the nearest box to MIN_SCALE at the box edge.
const MIN_SCALE = 0.7;

export function SwipeDeck({
  cards,
  answers,
  onAnswer,
  onUndo,
}: {
  cards: SwipeCard[];
  answers: SwipeAnswer[];
  onAnswer: (choice: Side) => void;
  onUndo: () => void;
}) {
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [dragging, setDragging] = useState(false);
  const [target, setTarget] = useState<Side | null>(null);
  const [dropping, setDropping] = useState<Side | null>(null);
  const drag = useRef<{ pointer: Point; origin: Point; startDist: number } | null>(null);
  const zones = useRef<Record<Side, HTMLDivElement | null>>({ left: null, right: null });
  const cardEl = useRef<HTMLDivElement>(null);
  const card = cards[answers.length];

  function zoneCenter(side: Side): Point | null {
    const r = zones.current[side]?.getBoundingClientRect();
    return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;
  }

  function distanceToBoxes(center: Point) {
    let nearest = Infinity;
    for (const el of Object.values(zones.current)) {
      const r = el?.getBoundingClientRect();
      if (!r) continue;
      const gx = Math.max(r.left - center.x, 0, center.x - r.right);
      const gy = Math.max(r.top - center.y, 0, center.y - r.bottom);
      nearest = Math.min(nearest, Math.hypot(gx, gy));
    }
    return nearest;
  }

  function scaleFor(center: Point, startDist: number) {
    const t = Math.min(distanceToBoxes(center) / Math.max(startDist, 1), 1);
    return MIN_SCALE + (1 - MIN_SCALE) * t;
  }

  function targetFor(center: Point, dx: number): Side | null {
    for (const side of ["left", "right"] as const) {
      const r = zones.current[side]?.getBoundingClientRect();
      if (
        r &&
        center.x >= r.left - NEAR_MARGIN &&
        center.x <= r.right + NEAR_MARGIN &&
        center.y >= r.top - NEAR_MARGIN &&
        center.y <= r.bottom + NEAR_MARGIN
      ) {
        return side;
      }
    }
    if (dx <= -SIDE_THRESHOLD) return "left";
    if (dx >= SIDE_THRESHOLD) return "right";
    return null;
  }

  function choose(side: Side, from?: Point) {
    if (dropping) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const rest = cardEl.current?.getBoundingClientRect();
    const origin = from ?? (rest && { x: rest.left + rest.width / 2, y: rest.top + rest.height / 2 });
    const dest = zoneCenter(side);
    setTarget(side);
    if (reduceMotion || !dest || !origin) {
      reset();
      onAnswer(side);
      return;
    }
    setOffset({ x: dest.x - origin.x, y: dest.y - origin.y });
    setDropping(side);
    setTimeout(() => {
      reset();
      onAnswer(side);
    }, DROP_MS);
  }

  function reset() {
    setOffset({ x: 0, y: 0 });
    setScale(1);
    setTarget(null);
    setDropping(null);
    setDragging(false);
    drag.current = null;
  }

  function release() {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    setDragging(false);
    if (target) choose(target, d.origin);
    else {
      setOffset({ x: 0, y: 0 });
      setScale(1);
      setTarget(null);
    }
  }

  const transform = dropping
    ? `translate(${offset.x}px, ${offset.y}px) scale(0.35)`
    : `translate(${offset.x}px, ${offset.y}px) rotate(${offset.x / 30}deg) scale(${scale})`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span className="tabular-nums">
          {Math.min(answers.length + 1, cards.length)} of {cards.length}
        </span>
        <Button variant="ghost" size="sm" onClick={onUndo} disabled={answers.length === 0 || !!dropping}>
          <Undo2 aria-hidden />
          Undo
        </Button>
      </div>

      {card ? (
        <div className="flex flex-col gap-4">
          <p className="text-center text-sm font-semibold text-muted-foreground">{card.prompt}</p>

          <div className="grid grid-cols-2 gap-3" aria-hidden>
            {(["left", "right"] as const).map((side) => (
              <div
                key={`${card.id}-${side}`}
                ref={(el) => {
                  zones.current[side] = el;
                }}
                className={cn(
                  "animate-in fade-in flex min-h-32 flex-col justify-between gap-3 rounded-2xl border-2 border-dashed p-3 text-sm leading-snug transition-all duration-150 sm:p-4 sm:text-base",
                  target === side
                    ? "scale-[1.04] border-solid border-primary bg-secondary shadow-md"
                    : "border-border",
                  side === "right" && "text-right",
                )}
              >
                <span>{card[side].label}</span>
                <span
                  className={cn(
                    "flex items-center gap-1 text-xs font-medium text-muted-foreground",
                    side === "right" && "justify-end",
                  )}
                >
                  {side === "left" && <ArrowLeft className="size-3.5" />}
                  {target === side ? "Let go to pick" : "Drop here"}
                  {side === "right" && <ArrowRight className="size-3.5" />}
                </span>
              </div>
            ))}
          </div>

          <div className="flex h-44 items-center justify-center">
            <div
              key={card.id}
              ref={cardEl}
              tabIndex={0}
              role="group"
              aria-label={`${card.prompt} Left: ${card.left.label} Right: ${card.right.label}. Use the left and right arrow keys to pick.`}
              onKeyDown={(e) => {
                if (e.key === "ArrowLeft") choose("left");
                if (e.key === "ArrowRight") choose("right");
              }}
              onPointerDown={(e) => {
                if (dropping) return;
                const r = e.currentTarget.getBoundingClientRect();
                const origin = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
                drag.current = {
                  pointer: { x: e.clientX, y: e.clientY },
                  origin,
                  startDist: distanceToBoxes(origin),
                };
                setDragging(true);
                e.currentTarget.setPointerCapture(e.pointerId);
              }}
              onPointerMove={(e) => {
                const d = drag.current;
                if (!d) return;
                // Keep the card's center on screen.
                const cx = Math.min(Math.max(d.origin.x + e.clientX - d.pointer.x, EDGE_PAD), window.innerWidth - EDGE_PAD);
                const cy = Math.min(Math.max(d.origin.y + e.clientY - d.pointer.y, EDGE_PAD), window.innerHeight - EDGE_PAD);
                const next = { x: cx - d.origin.x, y: cy - d.origin.y };
                setOffset(next);
                setScale(scaleFor({ x: cx, y: cy }, d.startDist));
                setTarget(targetFor({ x: cx, y: cy }, next.x));
              }}
              onPointerUp={release}
              onPointerCancel={release}
              style={{
                transform,
                opacity: dropping ? 0 : 1,
                transitionDuration: dragging ? "0ms" : `${DROP_MS}ms`,
              }}
              className={cn(
                "animate-in fade-in zoom-in-90 relative z-20 flex h-40 w-32 cursor-grab touch-none rounded-2xl outline-none select-none transition-[transform,opacity] ease-out focus-visible:ring-4 focus-visible:ring-ring/50 active:cursor-grabbing sm:w-36",
              )}
            >
              {/* Pointer capture during a drag fires pointerleave here, so the hover tilt flattens while dragging. */}
              <TiltCard
                strength={0.85}
                glare="none"
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-2 rounded-2xl bg-primary text-primary-foreground transition-[transform,box-shadow]",
                  dragging ? "shadow-2xl" : "shadow-lg",
                )}
              >
                <Sprout className="size-10" aria-hidden />
                <span className="text-xs font-semibold">Drag me</span>
              </TiltCard>
            </div>
          </div>

          <div className="flex justify-center gap-2">
            {(["left", "right"] as const).map((side) => (
              <button
                key={side}
                type="button"
                onClick={() => choose(side)}
                className="sr-only rounded-lg border border-border bg-background px-3 py-2 text-sm focus:not-sr-only focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                Pick: {card[side].label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          All {cards.length} done. Undo to change your last answer.
        </div>
      )}
    </div>
  );
}
