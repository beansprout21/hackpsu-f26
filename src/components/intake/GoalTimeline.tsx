"use client";

import { useRef, useState } from "react";
import { Check, GripVertical, Sprout } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { estimateTarget } from "@/lib/server/engine/defaults";
import { cn } from "@/lib/utils";
import { CUSHION_SIZED_NOTE, ESTIMATE_BASIS, costMax, formatHorizon, formatUsd, goalMeta } from "./copy";
import { isHabit, type GoalDraft } from "./draft";
import { TimelineTrack } from "./TimelineTrack";

const COST_STEP = 250;
// Same motion as the swipe cards: follow the pointer instantly, glide into place with this ease-out.
const SETTLE_MS = 240;
const LIFT_SCALE = 1.03;

type Drag = {
  index: number; // where the dragged goal started
  pointerY: number;
  dy: number;
  over: number; // where it would land if released now
  rects: { top: number; height: number }[];
  gap: number;
};

// Where the dragged goal lands: count the other goals whose middle it has passed.
function landingIndex(d: Pick<Drag, "index" | "dy" | "rects">) {
  const self = d.rects[d.index];
  const center = self.top + self.height / 2 + d.dy;
  let over = 0;
  d.rects.forEach((r, j) => {
    if (j !== d.index && center > r.top + r.height / 2) over++;
  });
  return over;
}

export function GoalTimeline({
  goals,
  onChange,
}: {
  goals: GoalDraft[];
  onChange: (goals: GoalDraft[]) => void;
}) {
  // Contracts v2.4: only money goals are ranked (and dragged); habits sit below, unranked.
  const money = goals.filter((g) => !isHabit(g.id));
  const habits = goals.filter((g) => isHabit(g.id));
  const patch = (id: GoalDraft["id"], p: Partial<GoalDraft>) => onChange(goals.map((g) => (g.id === id ? { ...g, ...p } : g)));
  const reorder = (from: number, to: number) => {
    const next = [...money];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange([...next, ...habits]);
  };

  const listRef = useRef<HTMLOListElement>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [settling, setSettling] = useState(false);
  const [instant, setInstant] = useState(false);

  function start(i: number, e: React.PointerEvent<HTMLElement>) {
    if (settling || e.button !== 0) return;
    const items = [...(listRef.current?.children ?? [])] as HTMLElement[];
    const rects = items.map((el) => {
      const r = el.getBoundingClientRect();
      return { top: r.top, height: r.height };
    });
    const gap = rects.length > 1 ? rects[1].top - (rects[0].top + rects[0].height) : 12;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Capture is a nicety (keeps moves coming if the pointer leaves the handle); dragging works without it.
    }
    setDrag({ index: i, pointerY: e.clientY, dy: 0, over: i, rects, gap });
  }

  function moveTo(clientY: number) {
    setDrag((d) => {
      if (!d || settling) return d;
      const dy = clientY - d.pointerY;
      return { ...d, dy, over: landingIndex({ ...d, dy }) };
    });
  }

  // Distance from the dragged goal's start to the top of the slot it lands in.
  function slotOffset(d: Drag) {
    let off = 0;
    if (d.over > d.index) for (let j = d.index + 1; j <= d.over; j++) off += d.rects[j].height + d.gap;
    if (d.over < d.index) for (let j = d.over; j < d.index; j++) off -= d.rects[j].height + d.gap;
    return off;
  }

  function release() {
    if (!drag || settling) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finish = () => {
      // Commit and drop the transforms in the same frame with transitions off, so nothing jumps.
      setInstant(true);
      if (drag.over !== drag.index) reorder(drag.index, drag.over);
      setDrag(null);
      setSettling(false);
      requestAnimationFrame(() => requestAnimationFrame(() => setInstant(false)));
    };
    if (reduceMotion) return finish();
    setSettling(true);
    setDrag({ ...drag, dy: slotOffset(drag) });
    setTimeout(finish, SETTLE_MS);
  }

  // Rank shown on each card while dragging (others slide aside, numbers follow).
  const order = money.map((_, j) => j);
  if (drag) order.splice(drag.over, 0, ...order.splice(drag.index, 1));

  function shiftFor(j: number) {
    if (!drag || j === drag.index) return 0;
    const h = drag.rects[drag.index].height + drag.gap;
    if (drag.index < j && j <= drag.over) return -h;
    if (drag.over <= j && j < drag.index) return h;
    return 0;
  }

  return (
    <div className="flex flex-col gap-5">
      <TimelineTrack
        goals={goals}
        onMove={(id, horizonMonths) => patch(id, { horizonMonths })}
      />

      <ol ref={listRef} className="flex flex-col gap-3" aria-label="Your money goals, most important first">
        {money.map((g, i) => {
          const meta = goalMeta(g.id);
          const costCap = costMax(g.id);
          const basis = ESTIMATE_BASIS[g.id];
          const estimate = estimateTarget(g.id);
          const isEstimate = g.targetAmount === undefined;
          const amount = g.targetAmount ?? estimate;
          const isDragged = drag?.index === i;
          const rank = order.indexOf(i) + 1;
          const tilt = isDragged && !settling ? Math.max(-2, Math.min(2, (drag?.dy ?? 0) / 60)) : 0;
          return (
            <li
              key={g.id}
              style={{
                transform: isDragged
                  ? `translateY(${drag!.dy}px) rotate(${tilt}deg) scale(${settling ? 1 : LIFT_SCALE})`
                  : `translateY(${shiftFor(i)}px)`,
                transitionDuration: instant || (isDragged && !settling) ? "0ms" : `${SETTLE_MS}ms`,
              }}
              className={cn(
                "relative flex flex-col gap-4 rounded-2xl border border-border bg-background p-4 transition-[transform,box-shadow] ease-out lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:items-center lg:gap-8 lg:px-6",
                isDragged ? "z-20 shadow-raised" : "z-0",
              )}
            >
              <div
                onPointerDown={(e) => start(i, e)}
                onPointerMove={(e) => drag && moveTo(e.clientY)}
                onPointerUp={release}
                onPointerCancel={release}
                className={cn("flex touch-none items-center gap-3 select-none", isDragged ? "cursor-grabbing" : "cursor-grab")}
              >
                <button
                  type="button"
                  aria-label={`Reorder ${meta.label}, rank ${i + 1} of ${money.length}. Use the up and down arrow keys to move it.`}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowUp" && i > 0) {
                      e.preventDefault();
                      reorder(i, i - 1);
                    } else if (e.key === "ArrowDown" && i < money.length - 1) {
                      e.preventDefault();
                      reorder(i, i + 1);
                    }
                  }}
                  className="-ml-2 flex h-10 w-6 shrink-0 cursor-[inherit] items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <GripVertical className="size-5" aria-hidden />
                </button>
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-highlight text-xs font-semibold text-highlight-foreground tabular-nums">
                  {rank}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="font-semibold">{meta.label}</span>
                  <span className="text-sm text-muted-foreground">In {formatHorizon(g.horizonMonths)}</span>
                </span>
              </div>

              {g.id === "emergency_fund" ? (
                <p className="text-sm text-muted-foreground">{CUSHION_SIZED_NOTE}</p>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm text-muted-foreground">
                      Roughly how much? <span className="font-medium text-foreground">{isEstimate ? "Sprout's estimate" : "Your number"}</span>
                    </span>
                    <span className="text-lg font-semibold tabular-nums">
                      {formatUsd(amount)}
                      {amount >= costCap && "+"}
                    </span>
                  </div>
                  <Slider
                    min={0}
                    max={costCap}
                    step={COST_STEP}
                    value={[Math.min(amount, costCap)]}
                    onValueChange={(v) => patch(g.id, { targetAmount: Array.isArray(v) ? v[0] : v })}
                    aria-label={`Rough cost for ${meta.label}`}
                    className="py-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>$0</span>
                    <span>{formatUsd(costCap)}+</span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-pressed={isEstimate}
                    onClick={() => patch(g.id, { targetAmount: undefined })}
                    className={cn("self-start gap-1.5 max-lg:h-11", isEstimate && "border-primary bg-secondary")}
                  >
                    {isEstimate ? <Check aria-hidden /> : <Sprout aria-hidden />}
                    Use Sprout&apos;s estimate ({formatUsd(estimate)})
                  </Button>
                  {basis && <p className="text-xs text-muted-foreground">{basis}</p>}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {habits.length > 0 && (
        <section aria-labelledby="habits-title" className="flex flex-col gap-3">
          <h3 id="habits-title" className="font-semibold">
            Healthy habits
          </h3>
          <ul className="flex flex-col gap-3">
            {habits.map((g) => {
              const meta = goalMeta(g.id);
              return (
                <li key={g.id} className="flex items-center gap-3 rounded-2xl border border-border bg-background p-4 lg:px-6">
                  <meta.icon className="size-5 shrink-0 text-highlight" aria-hidden />
                  <span className="flex min-w-0 flex-col">
                    <span className="font-semibold">{meta.label}</span>
                    <span className="text-sm text-muted-foreground">
                      In {formatHorizon(g.horizonMonths)} · {meta.hint}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

export function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "min-h-9 rounded-full border px-3 py-1.5 text-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        selected
          ? "border-primary bg-primary font-medium text-primary-foreground"
          : "border-border bg-background hover:border-primary/60 hover:bg-secondary",
      )}
    >
      <span className="inline-flex items-center gap-1.5">
        {selected && <Check className="size-3.5 shrink-0" aria-hidden />}
        {children}
      </span>
    </button>
  );
}
