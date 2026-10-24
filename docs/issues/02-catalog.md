## Goal
FNB product catalog as typed data the engine can score. Facts only from `docs/research-fnb-catalog.md`; never invent rates or fees.

## Acceptance criteria
- [ ] `src/data/catalog.json`: 15 to 25 products relevant to students and young families (must include: student-checking, smartsecured-card, savers-goal-cd, firstrate-savings, fnb-home-ownership-program, homeone-mortgage, fha-mortgage, cd-special, free-small-business-checking, learning-center), each matching the `Product` type
- [ ] Unpublished rates: `rateNote: "Check current rate with FNB"`
- [ ] `src/lib/server/catalog.ts`: `getCatalog()`, `getProduct(id)`, validates JSON with zod at load, throws on invalid
- [ ] A script or test that loads the catalog and prints count per goalTag
- [ ] Build + lint pass

## Files in scope
- `src/data/catalog.json`, `src/lib/server/catalog.ts`, `scripts/check-catalog.ts`

## Depends on
#1
