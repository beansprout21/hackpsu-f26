## Goal
The hero page. This is what judges remember.

## Acceptance criteria
- [ ] `/plan` reads Plan + GoalProfile from state (redirect to `/intake` if missing)
- [ ] Sections: rich life statement header + headline; monthly surplus math; allocation bars per goal with monthsToTarget; **roadmap in three columns or rows: "Start here" (now), "Next", "Unlocks later"**, with match cards and steps grouped by stage; `later` cards show their unlockCondition prominently (e.g. a lock icon + "Unlocks when: 3 months of expenses saved"); "Not yet" card; banker CTA
- [ ] Match card trust layer: product name, goal it serves, explanation, termsToKnow, score breakdown (expandable), confidence badge, source link + verified date
- [ ] "Book with an FNB banker": copies `bankerSummary` to clipboard, toast, opens https://www.fnb-online.com/schedule-an-appointment in new tab
- [ ] Badge when `aiUsed === false` is NOT shown to users (log only)
- [ ] Looks great with both `plan.student.json` and `plan.family.json` mocks

## Files in scope
- `src/app/plan/**`, `src/components/plan/**`

## Depends on
#1
