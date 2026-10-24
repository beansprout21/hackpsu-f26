# HackPSU Fall 2026: Team Ben + Ethan

Two people, each running their own Claude Code session on their own laptop. You cannot message the other person's Claude session directly. **GitHub is the shared coordination bus.** Follow the protocol below exactly.

## Hard deadlines (America/New_York)

- Sat 10/24 2:00 PM: hacking begins. No project code before this.
- Sat 10/24 11:59 PM: Devpost project must exist with tracks selected.
- Sun 10/25 ~9:00 AM: feature freeze. After this, only bug fixes and demo polish.
- Sun 10/25 1:45 PM: hacking ends, edits lock. Submit on Devpost AND hackpsu.org profile.

## Sources of truth

| File | Purpose | Owner |
|---|---|---|
| `docs/SPEC.md` | What we are building and why | Ben (lead agent) |
| `docs/CONTRACTS.md` | Shared types and API request/response shapes | Ben; changes need a `contract-change` PR |
| `docs/DECISIONS.md` | Append-only log of decisions | Anyone |
| `docs/DEMO.md` | Demo script and pitch | Ethan |
| GitHub Issues | Task queue | Created by Ben / lead agent |

Read `docs/SPEC.md` and `docs/CONTRACTS.md` before starting any task.

## Coordination protocol

1. **Before every task, run `/sync`.** It shows what the teammate is doing and which files their open PRs touch.
2. **Only work on issues assigned to you** (`gh issue list --assignee "@me"`). Never pick up the teammate's issues. If you run out, tell your human; do not self-assign unassigned work without their OK.
3. **Claim** the issue: add label `status:in-progress`, create branch `issue-<N>-<short-slug>` from latest `origin/main`.
4. **Stay in scope.** Edit only the files listed in the issue's "Files in scope". If you must touch anything else, first comment on the issue explaining why, and check `/sync` output that the teammate is not editing it.
5. **Contracts are frozen by default.** Do not edit `src/types/**` or `docs/CONTRACTS.md` inside a feature PR. Contract changes go in their own PR labeled `contract-change`, and your human must tell the teammate in person.
6. **Dependencies:** do not add an npm package without your human's OK (lockfile conflicts are the #1 merge failure). If added, merge that PR fast.
7. **Finish with `/ship`.** PR title includes `Closes #<N>`, build must pass, author merges (squash). Then comment a 2-line summary on the issue. This comment is how the other agent learns what changed.
8. **Blocked?** Add `status:blocked`, comment the exact blocker, move to your next assigned issue.
9. **Small PRs.** Merge at least every 60 to 90 minutes. `main` must always build and deploy.

## Git rules

- Never push directly to `main`. Never force-push. Never `git reset --hard` shared branches.
- `git pull --rebase origin main` before starting work and before opening a PR.
- Commit messages: `<type>(#<issue>): <summary>` e.g. `feat(#12): add results table`.

## Stack (scaffolded at 2:00 PM)

- Next.js (App Router) + TypeScript (strict), Tailwind CSS, shadcn/ui.
- AI calls server-side only, in `src/app/api/**` route handlers via the Anthropic SDK. API keys never reach the client.
- No database unless `docs/SPEC.md` says so. Seed/mock data lives in `src/data/`.
- Deploy: Vercel from `main`; preview URL per PR.

## Directory ownership (default; issues may override)

| Path | Default owner |
|---|---|
| `src/app/api/**`, `src/lib/ai/**`, `src/lib/server/**` | Ben |
| `src/app/(pages)`, `src/components/**`, styles | Ethan |
| `src/types/**`, `docs/CONTRACTS.md` | Shared, contract-change only |
| `docs/DEMO.md` | Ethan |

## Code conventions

- TypeScript strict, no `any` without a comment explaining why.
- Validate all API inputs with zod schemas defined from `src/types/`.
- Every API route returns `{ ok: true, data } | { ok: false, error }`.
- Frontend builds against mocks of the contract shapes until the real endpoint merges; keep mocks in `src/data/mocks/`.
- Demo reliability beats features: every AI call needs a timeout and a graceful fallback.

## Secrets

- `.env.local` only (gitignored). Variable names are listed in `.env.example`.
- Never print, log, or commit key values.
