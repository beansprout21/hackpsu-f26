## Goal
Auth0 login gating snapshot, plan, and API routes. Also our entry for MLH Best Use of Auth0.

## Acceptance criteria
- [ ] `@auth0/nextjs-auth0` installed and configured per its current README (verify env var names; update `.env.example` if they differ)
- [ ] Login/logout work locally and on Vercel (callback + logout URLs set in Auth0 dashboard for both)
- [ ] `/snapshot` and `/plan` redirect to login when signed out; after login, user returns to `/snapshot`
- [ ] `src/lib/server/auth.ts` exports `requireSession()` for API routes; applied to `/api/profile`, `/api/plan`, `/api/chat`
- [ ] Header shows user name + logout (component in `src/components/auth/UserMenu.tsx`)

## Files in scope
- `src/middleware.ts`, `src/lib/auth0.ts`, `src/lib/server/auth.ts`, `src/components/auth/**`, `.env.example`, API route guard lines only

## Depends on
#1
