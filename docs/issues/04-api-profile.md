## Goal
`POST /api/profile` turns intake answers into a GoalProfile with the AI.

## Acceptance criteria
- [ ] Route at `src/app/api/profile/route.ts`, validates request with zod, returns `ApiResponse<GoalProfile>`
- [ ] `src/lib/ai/client.ts`: Anthropic client, model from `ANTHROPIC_MODEL`, 15s timeout helper
- [ ] `src/lib/ai/profile.ts`: prompt + structured output (tool use or JSON) validated with zod; richLifeStatement in the user's voice; never mentions specific products
- [ ] Fallback to deterministic profile on error/timeout/invalid JSON
- [ ] Manual test with both personas documented in PR body
- [ ] Requires Auth0 session once #7 merges (leave a TODO guard until then)

## Files in scope
- `src/app/api/profile/**`, `src/lib/ai/**`

## Depends on
#1
