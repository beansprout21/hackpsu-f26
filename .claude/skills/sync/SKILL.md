---
name: sync
description: Show what the teammate is working on, which files open PRs touch, and what recently merged. Run before starting every task to avoid overlapping work.
allowed-tools: Bash(gh *) Bash(git *)
---

## Live repo state

Refreshing remote:
!`git fetch --quiet origin`

My assigned open issues:
!`gh issue list --assignee "@me" --state open`

All in-progress issues (both people):
!`gh issue list --label "status:in-progress" --state open`

Blocked issues:
!`gh issue list --label "status:blocked" --state open`

Open pull requests:
!`gh pr list --state open`

Files touched by each open PR:
!`gh pr list --state open --json number,author,headRefName,files`

Last 10 commits on main:
!`git log origin/main --oneline -10`

My current branch and local changes:
!`git status --short --branch`

## Your task

Produce a short briefing, max 12 lines:

1. **Teammate activity:** which issues they have in progress and which files/directories their open PRs touch.
2. **Overlap check:** for each of my assigned open issues, list any "Files in scope" that overlap with the teammate's open PR files. If there is overlap, say so in bold and recommend which issue to do instead.
3. **Recently merged:** anything on main in the last 10 commits that affects my next issue (especially `src/types/**` or `docs/CONTRACTS.md` changes). If contracts changed, tell me to re-read `docs/CONTRACTS.md`.
4. **Branch hygiene:** if my branch is behind `origin/main`, tell me to `git pull --rebase origin main`.
5. **Next:** recommend which of my assigned issues to take next (highest priority, unblocked, no overlap).

Do not modify any files or issues during /sync.
