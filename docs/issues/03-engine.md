## Goal
Deterministic matching and plan math. This is what makes recommendations trustworthy and the demo reliable even if AI fails.

## Acceptance criteria
- [ ] `src/lib/server/engine/math.ts`: monthlySurplus, emergencyFundTarget (3 x (fixed + debt)), allocation across goals weighted by priority (P1 50%, P2 30%, P3 20% of surplus, renormalized to the goals present), monthsToTarget; allocation never exceeds surplus; handles surplus <= 0 (all goes to a "wait / reduce costs" step)
- [ ] `src/lib/server/engine/score.ts`: per goal, score every catalog product with `ScoreBreakdown` (goalFit 0..40 by goalTag match, eligibility 0..25 by studentOnly/creditBands/lifeStages, affordability 0..20 by minOpeningDeposit vs savings and monthly allocation, priority 0..15 by goal priority); ineligible products score 0 and are excluded; top 2 per goal
- [ ] `src/lib/server/engine/notYet.ts`: rule set, at minimum: savings < emergencyFundTarget and goal first_home -> notYet for mortgages with reason + revisitWhen; credit_card when band "excellent" not needed for credit_building, etc.
- [ ] `src/lib/server/engine/plan.ts`: `buildPlanSkeleton(profile, snapshot, intake): Plan` with template text and `aiUsed: false`
- [ ] `src/lib/server/engine/defaults.ts`: target estimates per goal when user gave none
- [ ] `scripts/check-engine.ts` runs both personas and prints plans; Maya and Jordan produce different matches and Jordan gets a notYet for mortgage
- [ ] Build + lint pass

## Files in scope
- `src/lib/server/engine/**`, `scripts/check-engine.ts`

## Depends on
#1, #2 (can start on #1 mocks while #2 is in progress)
