"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { GoalId } from "@/types";
import { formatHorizon, goalMeta } from "./copy";
import type { GoalDraft } from "./draft";

const MIN_MONTHS = 1;
const MAX_MONTHS = 120;
const ROW_H = 54; // vertical step between stacked markers
const MARKER = 44;
const BASE_LIFT = 14; // gap between the track and the lowest marker
const MIN_GAP_PCT = 8; // markers closer than this (in % of track) stack instead of overlapping

const TICKS = [
  { months: 1, label: "Now" },
  { months: 12, label: "1 yr" },
  { months: 24, label: "2 yrs" },
  { months: 60, label: "5 yrs" },
  { months: 120, label: "10 yrs" },
];

// sqrt scale: most goals land within 2 years, so the near term gets more room.
const pct = (months: number) => Math.sqrt((months - MIN_MONTHS) / (MAX_MONTHS - MIN_MONTHS)) * 100;
const monthsAt = (fraction: number) =>
  Math.round(MIN_MONTHS + (MAX_MONTHS - MIN_MONTHS) * Math.min(Math.max(fraction, 0), 1) ** 2);

// Most recently moved goal takes the bottom row; anything it overlaps gets pushed up.
function stackRows(goals: GoalDraft[], recency: Partial<Record<GoalId, number>>) {
  const placed: { pos: number; row: number }[] = [];
  const rows = new Map<GoalId, number>();
  [...goals]
    .sort((a, b) => (recency[b.id] ?? 0) - (recency[a.id] ?? 0))
    .forEach((g) => {
      const pos = pct(g.horizonMonths);
      let row = 0;
      while (placed.some((p) => p.row === row && Math.abs(p.pos - pos) < MIN_GAP_PCT)) row += 1;
      placed.push({ pos, row });
      rows.set(g.id, row);
    });
  return rows;
}

export function TimelineTrack({
  goals,
  onMove,
}: {
  goals: GoalDraft[];
  onMove: (id: GoalId, months: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const tick = useRef(goals.length);
  const [recency, setRecency] = useState<Partial<Record<GoalId, number>>>(() =>
    Object.fromEntries(goals.map((g, i) => [g.id, i])),
  );
  const [dragging, setDragging] = useState<GoalId | null>(null);
  const [active, setActive] = useState<GoalId | null>(null);

  const rows = stackRows(goals, recency);
  const height = BASE_LIFT + MARKER + Math.max(goals.length - 1, 0) * ROW_H + 4;
  const labeled = goals.find((g) => g.id === (dragging ?? active));

  function move(id: GoalId, months: number) {
    const clamped = Math.min(Math.max(months, MIN_MONTHS), MAX_MONTHS);
    const current = goals.find((g) => g.id === id)?.horizonMonths;
    if (clamped === current) return;
    tick.current += 1;
    setRecency((r) => ({ ...r, [id]: tick.current }));
    onMove(id, clamped);
  }

  function monthsFromPointer(clientX: number) {
    const r = trackRef.current?.getBoundingClientRect();
    if (!r) return null;
    return monthsAt((clientX - r.left) / r.width);
  }

  return (
    <div className="rounded-3xl border border-border bg-gradient-to-b from-secondary to-background px-5 pt-4 pb-3 sm:px-8">
      <p className="mb-2 min-h-6 text-body text-muted-foreground" aria-hidden>
        {labeled ? (
          <span className="font-semibold text-foreground">
            {goalMeta(labeled.id).label} · in {formatHorizon(labeled.horizonMonths)}
          </span>
        ) : (
          "Drag each goal to when you want it"
        )}
      </p>
      <div className="relative mx-2" style={{ height }}>
        {TICKS.map((t) => (
          <span
            key={t.label}
            aria-hidden
            className="absolute bottom-0 w-px bg-border/70"
            style={{ left: `${pct(t.months)}%`, top: 0 }}
          />
        ))}

        {goals.map((g) => {
          const meta = goalMeta(g.id);
          const row = rows.get(g.id) ?? 0;
          const lift = BASE_LIFT + row * ROW_H;
          const isDragging = dragging === g.id;
          return (
            <div
              key={g.id}
              className={cn(
                "absolute bottom-0 -translate-x-1/2",
                isDragging ? "z-30" : "z-10 transition-[left] duration-300 ease-out",
              )}
              style={{ left: `${pct(g.horizonMonths)}%` }}
            >
              <span
                aria-hidden
                className="absolute bottom-0 left-1/2 w-0.5 -translate-x-1/2 rounded-full bg-primary/50 transition-[height] duration-300 ease-out"
                style={{ height: lift }}
              />
              <div
                className="absolute left-1/2 flex -translate-x-1/2 flex-col items-center transition-[bottom] duration-300 ease-out"
                style={{ bottom: lift }}
              >
                <button
                  type="button"
                  role="slider"
                  aria-label={`When for ${meta.label}`}
                  aria-valuemin={MIN_MONTHS}
                  aria-valuemax={MAX_MONTHS}
                  aria-valuenow={g.horizonMonths}
                  aria-valuetext={`In ${formatHorizon(g.horizonMonths)}`}
                  onFocus={(e) => {
                    if (e.currentTarget.matches(":focus-visible")) setActive(g.id);
                  }}
                  onBlur={() => setActive((a) => (a === g.id ? null : a))}
                  onKeyDown={(e) => {
                    const step = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 12, PageDown: -12 }[
                      e.key
                    ];
                    if (step) {
                      e.preventDefault();
                      move(g.id, g.horizonMonths + step);
                    } else if (e.key === "Home") move(g.id, MIN_MONTHS);
                    else if (e.key === "End") move(g.id, MAX_MONTHS);
                  }}
                  onPointerDown={(e) => {
                    setDragging(g.id);
                    e.currentTarget.setPointerCapture(e.pointerId);
                  }}
                  onPointerMove={(e) => {
                    if (dragging !== g.id) return;
                    const m = monthsFromPointer(e.clientX);
                    if (m !== null) move(g.id, m);
                  }}
                  onPointerUp={() => setDragging(null)}
                  onPointerCancel={() => setDragging(null)}
                  style={{ width: MARKER, height: MARKER }}
                  className={cn(
                    "flex cursor-grab touch-none items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground outline-none transition-[box-shadow,transform] duration-150 select-none focus-visible:ring-4 focus-visible:ring-ring/50 active:cursor-grabbing",
                    isDragging ? "scale-110 shadow-xl" : "shadow-md hover:scale-105",
                  )}
                >
                  <meta.icon className="size-5" aria-hidden />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div ref={trackRef} className="relative mx-2 h-2 rounded-full bg-primary/30">
        {TICKS.map((t) => (
          <span
            key={t.label}
            aria-hidden
            className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-highlight"
            style={{ left: `${pct(t.months)}%` }}
          />
        ))}
      </div>
      <div className="relative mx-2 mt-2 h-5 text-xs font-medium text-muted-foreground" aria-hidden>
        {TICKS.map((t, i) => (
          <span
            key={t.label}
            className={cn(
              "absolute whitespace-nowrap",
              i === 0 ? "left-0" : i === TICKS.length - 1 ? "right-0" : "-translate-x-1/2",
            )}
            style={i === 0 || i === TICKS.length - 1 ? undefined : { left: `${pct(t.months)}%` }}
          >
            {t.label}
          </span>
        ))}
      </div>
    </div>
  );
}
