## Goal
Financial snapshot form, then trigger profile + plan generation.

## Acceptance criteria
- [ ] `/snapshot`: inputs for every `FinancialSnapshot` field, credit band as 5 buttons, FNB customer toggle, live "monthly surplus" readout
- [ ] Persona prefill buttons; disabled "Connect your bank (coming soon, via Plaid)" button
- [ ] Disclaimer: "Educational prototype. Not financial advice. No data is stored."
- [ ] Submit calls `/api/profile` then `/api/plan`, shows staged loading ("Understanding your goals", "Matching FNB products"), saves results to state, routes to `/plan`
- [ ] Until APIs exist, uses mocks from `src/data/mocks/` behind a `USE_MOCKS` flag in `src/lib/client/api.ts`
- [ ] Errors shown inline with retry

## Files in scope
- `src/app/snapshot/**`, `src/components/snapshot/**`, `src/lib/client/api.ts`

## Depends on
#1, #9 (state file)
