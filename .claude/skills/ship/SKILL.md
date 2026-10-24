---
name: ship
description: Finish the current issue branch - verify build, rebase on main, open a PR that closes the issue, merge it, and post a summary comment so the teammate's agent knows what changed.
disable-model-invocation: true
allowed-tools: Bash(gh *) Bash(git *) Bash(npm run build) Bash(npm run lint)
---

## Context

Current branch and status:
!`git status --short --branch`

Commits on this branch not on main:
!`git log origin/main..HEAD --oneline`

## Procedure

1. **Identify the issue** from the branch name `issue-<N>-...`. If the branch does not match that pattern, STOP and ask me.
2. **Commit** any remaining changes: `git add -A` then `git commit -m "<type>(#<N>): <summary>"`. Never commit `.env*` files except `.env.example`.
3. **Rebase:** `git fetch origin` then `git rebase origin/main`. If there are conflicts, STOP, show me the conflicting files, and do not resolve conflicts in files outside this issue's scope without my OK.
4. **Verify:** `npm run build` and `npm run lint` must pass. If either fails, fix it (within scope) or STOP and tell me.
5. **Push:** `git push -u origin HEAD`.
6. **Open PR:** `gh pr create --base main --title "<summary> (Closes #<N>)" --body "<body>"` where the body has:
   - `Closes #<N>`
   - What changed (max 5 bullets)
   - Files changed
   - How it was verified
   - Any contract or dependency impact (should be "none" unless this is a `contract-change` PR)
7. **Merge:** `gh pr merge --squash --delete-branch`. If merge is blocked or checks are failing, STOP and tell me.
8. **Summarize on the issue:** `gh issue comment <N> --body "Shipped in PR #<PR>. <2-line summary of what now exists and any interface the teammate can use>."`
9. **Reset locally:** `git checkout main` then `git pull --rebase origin main`.
10. Tell me it shipped and suggest running `/next`.
