## Goal
P1: `POST /api/chat` answers "why?" and "what if?" questions grounded in the user's plan.

## Acceptance criteria
- [ ] Route + `src/lib/ai/chat.ts`, response `{ answer, citedProductIds }`, only catalog IDs
- [ ] Refuses to invent rates; points to FNB for current rates
- [ ] "What if I save $100 more per month?" returns a recalculated monthsToTarget using engine math, not AI arithmetic

## Files in scope
- `src/app/api/chat/**`, `src/lib/ai/chat.ts`

## Depends on
#5
