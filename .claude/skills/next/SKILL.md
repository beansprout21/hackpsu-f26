---
name: next
description: Claim and start the next GitHub issue assigned to me. Use when I say "next task", "what should I work on", or pass an issue number.
argument-hint: "[issue-number]"
disable-model-invocation: true
allowed-tools: Bash(gh *) Bash(git *) Read Grep Glob
---

## Context

Requested issue number (empty means pick one): $ARGUMENTS

My open assigned issues:
!`gh issue list --assignee "@me" --state open --json number,title,labels`

Teammate's in-progress work:
!`gh issue list --label "status:in-progress" --state open`

Files touched by open PRs:
!`gh pr list --state open --json number,author,files`

## Procedure

1. **Pick the issue.**
   - If an issue number was given above, use it. Confirm it is assigned to me; if not, STOP and tell me.
   - Otherwise pick my highest priority (`P0` before `P1`) issue labeled `status:ready` that is not `status:blocked` and whose "Files in scope" do not overlap with any open PR's files.
   - If nothing qualifies, STOP and tell me why. Do not take unassigned or teammate issues.
2. **Read it fully:** `gh issue view <N> --comments`. Then read `docs/SPEC.md`, `docs/CONTRACTS.md`, and every file listed in "Files in scope".
3. **Claim it:**
   - `gh issue edit <N> --add-label "status:in-progress" --remove-label "status:ready"`
   - `git checkout main` then `git pull --rebase origin main`
   - `git checkout -b issue-<N>-<short-slug>`
4. **Plan before coding.** Show me a plan of max 8 bullets: files to change, approach, how I will verify acceptance criteria. Wait for my go-ahead unless the issue is labeled `quick`.
5. **Implement** within the issue's "Files in scope" only. If you need to touch another file, comment on the issue first (`gh issue comment <N> --body "..."`) and tell me.
6. **Verify** every acceptance criterion. At minimum run `npm run build` and `npm run lint` and fix failures.
7. When done, tell me to run `/ship`.

Follow every rule in CLAUDE.md, especially: never edit `src/types/**` or `docs/CONTRACTS.md` in a feature branch, never add npm packages without asking me.
