## Goal
Gamified goal intake that captures what the user wants, why, and when. Fast and fun, under 60 seconds.

## Acceptance criteria
- [ ] `/intake`: card-by-card flow with progress bar: (1) life stage, (2) pick up to 3 values, (3) pick 1 to 3 goals, (4) per goal: priority, horizon slider, optional target amount, "why" quick-pick chips + optional text, (5) optional "describe your rich life" text
- [ ] Writes `IntakeAnswers` to app state (`src/lib/client/state.tsx`, React context + sessionStorage key `waypoint:v1`)
- [ ] "Use Maya" / "Use Jordan" demo shortcut buttons that fill intake from personas
- [ ] Finish navigates to `/snapshot`
- [ ] Back button works on every card

## Files in scope
- `src/app/intake/**`, `src/components/intake/**`, `src/lib/client/state.tsx`

## Depends on
#1
