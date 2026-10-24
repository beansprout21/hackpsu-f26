## Goal
`POST /api/plan`: engine output + AI explanations = the Plan shown on the hero page.

## Acceptance criteria
- [ ] Route at `src/app/api/plan/route.ts`, zod-validated, returns `ApiResponse<Plan>`
- [ ] Calls `buildPlanSkeleton`, then AI writes headline, per-match explanation (must reference the user's goal motivation), step title/detail, bankerSummary
- [ ] AI never changes scores, amounts, or product IDs; server re-validates every productId against catalog and drops unknown
- [ ] Fallback returns skeleton with `aiUsed: false` on any AI failure
- [ ] Total latency under 20s for both personas; log timing
- [ ] Build + lint pass

## Files in scope
- `src/app/api/plan/**`, `src/lib/ai/plan.ts`

## Depends on
#3, #4
