"use client";

import { useRef, type PointerEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const MAX_TILT_DEG = 6;
const PRESS_SCALE = 0.985;
const GLARE_LAYER =
  "pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-500 group-data-[active=true]/tilt:opacity-100";
const CAN_TILT = "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)";

// A card that dips under the cursor as if the pointer had weight: the corner nearest the pointer sinks
// away and shades slightly, while a glare catches the raised opposite corner. Mouse only; touch and
// reduced-motion users get a static card. `strength` scales the tilt, press and glare together.
// `glare="spot"` suits white cards; `glare="soft"` is a broad, faint glow blended into a colored card
// so it reads as a reflection instead of a white wash; `glare="none"` is the tilt and press alone.
export function TiltCard({
  className,
  children,
  strength = 1,
  glare = "spot",
}: {
  className?: string;
  children: ReactNode;
  strength?: number;
  glare?: "spot" | "soft" | "none";
}) {
  const ref = useRef<HTMLDivElement>(null);

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || e.pointerType !== "mouse" || !window.matchMedia(CAN_TILT).matches) return;
    const r = el.getBoundingClientRect();
    const x = Math.min(Math.max((e.clientX - r.left) / r.width, 0), 1);
    const y = Math.min(Math.max((e.clientY - r.top) / r.height, 0), 1);
    el.dataset.active = "true";
    // Positive rotateY pushes the right edge away; negative rotateX pushes the bottom edge away.
    el.style.setProperty("--ry", `${(x - 0.5) * 2 * MAX_TILT_DEG * strength}deg`);
    el.style.setProperty("--rx", `${(0.5 - y) * 2 * MAX_TILT_DEG * strength}deg`);
    el.style.setProperty("--s", `${1 - (1 - PRESS_SCALE) * strength}`);
    el.style.setProperty("--lx", `${(1 - x) * 100}%`);
    el.style.setProperty("--ly", `${(1 - y) * 100}%`);
  };

  const onPointerLeave = () => {
    const el = ref.current;
    if (!el) return;
    delete el.dataset.active;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
    el.style.setProperty("--s", "1");
  };

  return (
    <div
      ref={ref}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      style={{ transform: "perspective(900px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg)) scale(var(--s, 1))" }}
      className={cn(
        "group/tilt relative transition-transform duration-500 ease-out will-change-transform data-[active=true]:duration-150",
        className,
      )}
    >
      {children}
      {glare === "none" ? null : glare === "spot" ? (
        <span
          aria-hidden
          className={GLARE_LAYER}
          style={{
            background: `radial-gradient(farthest-corner circle at var(--lx, 50%) var(--ly, 50%), rgb(255 255 255 / ${0.45 * strength}) 0%, rgb(255 255 255 / 0) 30%, rgb(16 40 24 / ${0.07 * strength}) 100%)`,
          }}
        />
      ) : (
        <>
          <span
            aria-hidden
            className={GLARE_LAYER}
            style={{
              background: `radial-gradient(farthest-corner circle at calc(100% - var(--lx, 50%)) calc(100% - var(--ly, 50%)), rgb(16 40 24 / ${0.14 * strength}) 0%, rgb(16 40 24 / 0) 70%)`,
            }}
          />
          <span
            aria-hidden
            className={cn(GLARE_LAYER, "mix-blend-overlay")}
            style={{
              background: `radial-gradient(farthest-corner circle at var(--lx, 50%) var(--ly, 50%), rgb(255 255 255 / ${0.45 * strength}) 0%, rgb(255 255 255 / ${0.2 * strength}) 35%, rgb(255 255 255 / 0) 75%)`,
            }}
          />
        </>
      )}
    </div>
  );
}
