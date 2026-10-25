"use client";

// Money-tree loader (#96): a seed sprouts, grows a trunk and branches, then fills with coin leaves.
// `growth` (0..1) comes from the real progress of the plan build, so the tree only grows as calls finish.
// Pure SVG + CSS transitions. With reduced motion it shows the finished tree, still.
import { useSyncExternalStore, type CSSProperties } from "react";

const REDUCED = "(prefers-reduced-motion: reduce)";
const subscribe = (onChange: () => void) => {
  const mq = window.matchMedia(REDUCED);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
};
const useReducedMotion = () =>
  useSyncExternalStore(
    subscribe,
    () => window.matchMedia(REDUCED).matches,
    () => false,
  );

// Local progress of one part that grows between `from` and `to` (fractions of overall growth).
const phase = (g: number, from: number, to: number) => Math.min(1, Math.max(0, (g - from) / (to - from)));

const TRUNK = "#8a6a4b";
const LEAF = "#7ebc89";
const LEAF_DARK = "#5ea06b";
const CANOPY = "#c6e3cd";
const COIN = "#e3b341";
const COIN_EDGE = "#b7862b";

// Coin leaves: where they hang and when each one pops in.
// Timed so most coins are out during a typical plan call (growth ~0.65 when it lands); "done" adds the rest.
const COINS = [
  { x: 66, y: 74, at: 0.52 },
  { x: 134, y: 70, at: 0.57 },
  { x: 100, y: 46, at: 0.63 },
  { x: 82, y: 98, at: 0.72 },
  { x: 120, y: 96, at: 0.82 },
];

export function GrowingSprout({ growth, className }: { growth: number; className?: string }) {
  const reduced = useReducedMotion();
  const g = reduced ? 1 : Math.min(1, Math.max(0, growth));
  const ease = reduced ? undefined : "transform 700ms cubic-bezier(0.22, 1, 0.36, 1), opacity 500ms ease-out, stroke-dashoffset 700ms ease-out";

  // Scale a part in from a fixed point (SVG user units).
  const grow = (p: number, ox: number, oy: number): CSSProperties => ({
    transform: `scale(${p})`,
    transformOrigin: `${ox}px ${oy}px`,
    transformBox: "view-box",
    opacity: p > 0 ? 1 : 0,
    transition: ease,
  });
  // Draw a stroke along its length (paths use pathLength=1).
  const draw = (p: number): CSSProperties => ({
    strokeDasharray: 1,
    strokeDashoffset: 1 - p,
    transition: ease,
  });

  const seed = 1 - phase(g, 0.05, 0.2);
  const sprout = phase(g, 0.05, 0.3);
  const trunk = phase(g, 0.3, 0.42);
  const branches = phase(g, 0.36, 0.48);
  const canopy = phase(g, 0.4, 0.52);
  const sproutLeaves = 1 - phase(g, 0.4, 0.5); // the first two leaves give way to the canopy

  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden focusable="false">
      {/* soil */}
      <ellipse cx="100" cy="178" rx="58" ry="10" fill="#e9dfcc" />
      <ellipse cx="100" cy="176" rx="40" ry="6" fill="#d9c7a8" />

      {/* seed */}
      <ellipse cx="100" cy="172" rx="7" ry="5" fill={TRUNK} style={grow(seed, 100, 172)} />

      {/* canopy behind the trunk */}
      <g style={grow(canopy, 100, 120)}>
        <circle cx="100" cy="78" r="44" fill={CANOPY} />
        <circle cx="70" cy="92" r="28" fill={CANOPY} />
        <circle cx="130" cy="92" r="28" fill={CANOPY} />
      </g>

      {/* trunk: a short sprout stem first, then the full trunk */}
      <path d="M100 172 L100 146" pathLength={1} stroke={LEAF_DARK} strokeWidth="4" strokeLinecap="round" fill="none" style={draw(sprout)} />
      <path d="M100 172 C100 150 98 130 100 100" pathLength={1} stroke={TRUNK} strokeWidth="9" strokeLinecap="round" fill="none" style={draw(trunk)} />
      <path d="M100 124 C90 112 80 104 70 92" pathLength={1} stroke={TRUNK} strokeWidth="5" strokeLinecap="round" fill="none" style={draw(branches)} />
      <path d="M100 116 C112 104 122 96 130 88" pathLength={1} stroke={TRUNK} strokeWidth="5" strokeLinecap="round" fill="none" style={draw(branches)} />

      {/* sprout leaves */}
      <g style={{ opacity: sproutLeaves, transition: ease }}>
        <ellipse cx="90" cy="144" rx="10" ry="5" fill={LEAF} transform="rotate(-25 90 144)" style={grow(sprout, 100, 146)} />
        <ellipse cx="110" cy="140" rx="10" ry="5" fill={LEAF} transform="rotate(25 110 140)" style={grow(sprout, 100, 146)} />
      </g>

      {/* green leaves on the branches */}
      <g style={grow(canopy, 100, 110)}>
        <ellipse cx="78" cy="68" rx="9" ry="5" fill={LEAF} transform="rotate(-30 78 68)" />
        <ellipse cx="120" cy="58" rx="9" ry="5" fill={LEAF} transform="rotate(30 120 58)" />
        <ellipse cx="146" cy="88" rx="9" ry="5" fill={LEAF_DARK} transform="rotate(20 146 88)" />
        <ellipse cx="56" cy="96" rx="9" ry="5" fill={LEAF_DARK} transform="rotate(-20 56 96)" />
      </g>

      {/* coin leaves */}
      {COINS.map((c) => (
        <g key={`${c.x}-${c.y}`} style={grow(phase(g, c.at - 0.06, c.at), c.x, c.y)}>
          <circle cx={c.x} cy={c.y} r="9" fill={COIN} stroke={COIN_EDGE} strokeWidth="2" />
          <text x={c.x} y={c.y + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill={COIN_EDGE}>
            $
          </text>
        </g>
      ))}
    </svg>
  );
}
