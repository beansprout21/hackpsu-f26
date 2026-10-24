## Goal
Working Next.js app deployed on Vercel with shared types, so both people can build in parallel against contracts. **Do this at 2:00 PM first; it blocks everything.**

## Acceptance criteria
- [ ] `npx create-next-app@latest` with TypeScript, Tailwind, ESLint, App Router, `src/` dir, npm
- [ ] shadcn/ui initialized (button, card, input, label, slider, badge, progress, dialog, tabs, toast or sonner)
- [ ] `src/types/index.ts` = types from `docs/CONTRACTS.md` verbatim; `src/types/schemas.ts` = zod schemas for IntakeAnswers, FinancialSnapshot, GoalProfile, Plan
- [ ] `src/data/mocks/` with `profile.student.json`, `profile.family.json`, `plan.student.json`, `plan.family.json` that validate against the schemas, including at least one `now`, one `next`, and one `later` match with unlockCondition per plan (use realistic values from the personas in CONTRACTS.md and product IDs from #2's planned IDs: `student-checking`, `smartsecured-card`, `savers-goal-cd`, `fnb-home-ownership-program`, `homeone-mortgage`, `firstrate-savings`)
- [ ] `src/data/personas.ts` exporting Maya and Jordan exactly as in CONTRACTS.md
- [ ] Placeholder routes: `/`, `/intake`, `/snapshot`, `/plan` each rendering a heading
- [ ] Imported to Vercel, production URL works, URL added to README
- [ ] `npm run build` and `npm run lint` pass

## Files in scope
- everything (initial scaffold), including `src/types/**` (allowed in this issue only)

## Depends on
none
