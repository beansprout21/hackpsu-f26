import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { PersonaId } from "@/types";

// One flat illustration per persona: the Sprout seedling plus a motif (kite, plane, shield, family,
// growth bars, savings jar). Colors come from the theme tokens so they follow the palette.
const C = {
  bg: "var(--color-brand-100)",
  ground: "var(--color-brand-200)",
  stem: "var(--color-brand-600)",
  leafA: "var(--color-brand-400)",
  leafB: "var(--color-brand-500)",
  ink: "var(--color-highlight)",
  card: "var(--color-card)",
  coin: "var(--color-warning-soft)",
  coinRim: "var(--color-warning)",
};

// Seedling drawn from its base at (0, 0), growing up.
function Seedling({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M0 0V-24" stroke={C.stem} strokeWidth={3} strokeLinecap="round" />
      <path d="M0 -17C-8 -17 -14 -23 -14 -31C-6 -31 0 -26 0 -17Z" fill={C.leafA} />
      <path d="M0 -21C0 -30 6 -36 15 -36C15 -27 9 -21 0 -21Z" fill={C.leafB} />
    </g>
  );
}

const Ground = () => <ellipse cx={48} cy={79} rx={24} ry={4} fill={C.ground} />;

const ART: Record<PersonaId, () => ReactNode> = {
  freedom_seeker: () => (
    <>
      <Ground />
      <path d="M48 52C54 46 60 44 66 36" stroke={C.ink} strokeWidth={1.5} strokeDasharray="2 3" fill="none" />
      <path d="M70 12L80 24L70 38L60 24Z" fill={C.ink} />
      <path d="M70 12V38M60 24H80" stroke={C.card} strokeWidth={1.5} />
      <path d="M70 38C68 42 72 44 70 48" stroke={C.ink} strokeWidth={1.5} fill="none" strokeLinecap="round" />
      <Seedling x={44} y={79} />
    </>
  ),
  experience_collector: () => (
    <>
      <Ground />
      <path d="M16 46C26 30 42 34 58 26" stroke={C.ink} strokeWidth={2} strokeDasharray="2 4" strokeLinecap="round" fill="none" />
      <path d="M58 26L82 16L72 38L67 29Z" fill={C.card} stroke={C.ink} strokeWidth={2} strokeLinejoin="round" />
      <path d="M67 29L82 16" stroke={C.ink} strokeWidth={1.5} />
      <Seedling x={48} y={79} />
    </>
  ),
  safety_builder: () => (
    <>
      <Ground />
      <path
        d="M48 16L72 25V46C72 62 61 72 48 78C35 72 24 62 24 46V25Z"
        fill={C.card}
        stroke={C.ink}
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
      <Seedling x={48} y={68} s={0.85} />
    </>
  ),
  family_first: () => (
    <>
      <Ground />
      <path
        d="M48 30C48 30 38 24 38 18C38 14 41 12 44 12C46 12 47.5 13 48 14.5C48.5 13 50 12 52 12C55 12 58 14 58 18C58 24 48 30 48 30Z"
        fill={C.ink}
      />
      <Seedling x={30} y={79} s={0.7} />
      <Seedling x={66} y={79} s={0.6} />
      <Seedling x={48} y={79} />
    </>
  ),
  future_builder: () => (
    <>
      <Ground />
      <rect x={18} y={68} width={9} height={11} rx={2} fill={C.leafA} />
      <rect x={30} y={60} width={9} height={19} rx={2} fill={C.leafB} />
      <rect x={42} y={50} width={9} height={29} rx={2} fill={C.stem} />
      <path d="M16 50L28 42L38 45L54 28" stroke={C.ink} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M46 28H54V36" stroke={C.ink} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Seedling x={66} y={79} s={0.95} />
    </>
  ),
  simple_saver: () => (
    <>
      <Ground />
      <rect x={30} y={44} width={36} height={35} rx={9} fill={C.card} stroke={C.ink} strokeWidth={2.5} />
      <rect x={34} y={38} width={28} height={7} rx={2} fill={C.ink} />
      <circle cx={48} cy={63} r={8} fill={C.coin} stroke={C.coinRim} strokeWidth={2} />
      <path d="M48 59V67" stroke={C.coinRim} strokeWidth={2} strokeLinecap="round" />
      <Seedling x={48} y={38} s={0.8} />
    </>
  ),
};

export function PersonaArt({ id, label, className }: { id: PersonaId; label: string; className?: string }) {
  const Art = ART[id];
  return (
    <svg viewBox="0 0 96 96" role="img" aria-label={`${label} illustration`} className={cn("shrink-0", className)}>
      <circle cx={48} cy={48} r={48} fill={C.bg} />
      <Art />
    </svg>
  );
}
