# Overnight run and morning checklist (Sun Oct 25)

Owner: lead agent. Updated hourly overnight; final summary at 7:15 AM.

## Overnight setup (2:20 AM to 7:00 AM)
| Role | Session | Log issue | Does |
|---|---|---|---|
| Finder | D | #119 | Stress harness (new seed each cycle), persona browser pass, capped live-AI sample; files `[stress]` issues |
| Fixer | A | #120 | Takes `overnight` + `status:ready` issues (P0 first), fixes with a regression check, full suite, one merge per cycle |
| AI auditor | B | #121 | Live-AI audit of plans and chats; fixes prompts, guards, templates |
| Lead | this chat | this file | Hourly verification of `main`, triage, rule clarifications, materials |

Budget caps: Finder 120 plan builds / 240 chats; Auditor 200 / 400. Stop: 7:00 AM.

Lead decisions made overnight (Ben may override):
- Goal weights 60/25/15 go by **rank among money goals** (#106); both entry paths compute the same.
- No consumer loans anywhere; homebuyer programs only, `later`, for `first_home` (#118).

## Materials (drafted overnight)
- Pitch deck (Slides, 11 slides): https://claude.ai/artifact/H3aXmWCYe6EvKvYk6kP9Ju
- Expo pitch script (3 min) + judge Q&A: https://claude.ai/artifact/4bgKV2qDQLuFkpb8oNStRs
- Video script (4:40) + recording checklist: https://claude.ai/artifact/9RbEbK63LvoEe7gUTj97cj
- FNB partnership one-pager: https://claude.ai/artifact/C6H2J8VZCdKNULW2LMH8wg
- These are private links: share them from each page's Share menu before showing anyone else.

## Morning checklist (Ben)
1. **7:30** Read the 7:15 summary (below and in chat). Check the three log issues' final comments.
2. **7:40 Redeploy:** Vercel, Deployments, newest `main` commit, Redeploy. If "rate limited": Settings, Billing, upgrade to Pro, then redeploy. Still blocked by 9:30: demo from localhost (`npm run dev`).
3. **7:50 Click-test production** as Maya, Maya opposite swipes, Jordan, no income, habits only: intake, snapshot (try the sample statement), Overview, Ask Sprout chips, Share then Banker view then Stop sharing, Save PDF, phone width.
4. **8:30 Confirm Maya numbers** and replace every `[confirm]` in the deck (slides 5, 6), pitch script and video script.
5. **8:45 Walk to ECoRE.** 9:00 feature freeze: bug fixes only.
6. **9:00 Rehearse** the 3-minute pitch twice with Ethan (pitch doc).
7. **10:00 Record** the video (video doc); upload Unlisted to YouTube by 11:30.
8. **11:30 Devpost update** (lead does it, Ben approves): new video link; story numbers (Ask Sprout example currently says "$140 from guilt-free"; replace with the $129 gap); add 3 to 5 gallery screenshots (Overview, step guide, Ask Sprout, banker view, persona reveal) at 3:2; check built-with and links.
9. **12:00** Final check that Devpost shows Submitted and hackpsu.org shows the project. Hacking ends 1:45 PM; judging 2:00 to 3:30 PM, ECoRE 2nd floor (one of you must be present and scanned in).

## Hourly log

### 3:20 AM (lead wake 1)
**Verified by the lead on `main` aa1cf57 (AI off, local):** check-engine, check-overview, check-chat pass; scenarios pass (0 flagged); stress (seed 9707, 314 users) 0 crashes, 0 API problems, 0 chat problems, 2 failing invariants: goal bucket lands on money goals 41 (#107), no surplus: only $0 products 118 (#109). Maya golden unchanged ($91 / $22 / $118): #106 not applied yet.

**Agent reports (not re-checked by the lead beyond the run above):**
- Finder (#119): cycle 2 at 3:06, seed 83923, 514 users; same 2 invariants failing. Live AI 0 (no key in its clone).
- Fixer (#120): merged #127 (#124), #129 (#126, schema-invalid plans and Ask Sprout 400s). #133 (#130, IRA/credit-card tags) ready but held on a +1 in #109's count.
- AI auditor (#121): stopped at 3:13 after 8 cycles, full cap used (200 plans / 400 chats, about 200 profiles). Fallback 0% in the last 5 cycles; plan ~8 s, chat ~1.7 s. 9 PRs merged (#125 to #137).

**Lead decisions (SPROUT.md v3.3; Ben may override):**
- #130: merge #133 now. The +1 is an existing #109 failure made visible, not a regression.
- #109: what counts as a $0 product with no surplus (education tools, $0 deposit, or an everyday account funded from current savings); everything else `later`.
- #107: habits only, all savings go to the safety cushion; never "your savings goal" without one.
- #105: engine keeps the first of duplicate goal ids; no contract change.
- Fixer order: #133 merge, #106 (Maya numbers, demo-critical), #109, #107, #105, then P1s.

**API use tonight:** Auditor 200 plans / 400 chats (cap reached), Finder 0, Fixer 0. Dollar cost not measured here; check console.anthropic.com usage in the morning.

**Vercel:** PR deploys still rate-limited ("more than 100 deployments in 24 h, retry in 24 hours"). Production is still the last good deploy.

### 4:25 AM (lead wake 2)
**Verified by the lead on `main` 80c14f3 (AI off):** check-engine, check-overview, check-chat, scenarios all pass; stress (seed 9707) still fails only #107 (41) and #109 (119). Maya unchanged ($91 / $22 / $118).

**Merged since 3:20:** #133 (#130: no IRA for any goal, no card/loan/CardGuard for the cushion), #140 (#139: "Mortgage calculators can get you ready").

**Found and fixed in the process (lead):**
- The Fixer only takes issues assigned to it, and #105, #106, #107 were unassigned, so it idled 3:25 to 4:20. Now assigned to beansprout21 with #109 (reopened: it was closed by mistake right after #133 merged, but its rule isn't built yet) and the text/logic P1s #111 to #114. #115 (tap target sizes) stays for Ethan: styling.
- Closed as fixed after verification: #104 (schema-valid 0), #108 (no raw month counts), #110 ("safety cushion" everywhere).
- Rule clarified (#109): FNB Student Checking keeps a `null` deposit (FNB doesn't publish one) and is allowed `now` for no-surplus students; never "$0 to open".

**For Ben:** the Fixer reports one rule slip: it force-pushed (`--force-with-lease`) its own PR branch for #133 after a rebase. Its branch only, nothing lost; it now merges instead of rebasing.

### 5:30 AM (lead wake 3)
**MAYA CHANGED (#106, PR #143):** travel $91 → **$80**, home $22 → **$33**, Japan gap $118 → **$129**. Levers: move $129 from guilt-free (guilt-free stays $128), 32 months, or $960. Cushion unchanged: $1,950, full in 14 months, 1 month covered in 3. Opposite swipes: Safety Builder, cushion full in 12 months, travel $144 away.
- Verified by the lead: check-engine passes against this golden on `main` b2a3a65.
- Updated to these numbers: deck slides 5, 6, 7 (no `[confirm]` left; slide 7 test line now says 2,000+ generated users, 200 live AI plans, 400 answers), pitch script + Q&A, video script, DASHBOARD.md, ASK_SPROUT.md.
- **Still quoting $140 (yours to change in the morning):** the Devpost story, docs/DEMO.md (Ethan's), and a voice example in `src/lib/ai/plan.ts` (code; harmless, the number guard catches copied numbers).

**Verified by the lead on `main` b2a3a65 (AI off):** check-engine, check-overview, check-chat, scenarios pass. Stress seed 9707: goal bucket 40 (#107), no surplus 96 under the v3.3 invariant (#109). Everything else 0.

**Merged since 4:25:** #142 (#105 duplicate goal ids), #143 (#106 rank weights), #145 (Finder: v3.3 invariants, seed override, STRESS.md).

**Agent health:**
- **Fixer stopped at 4:40 AM** after its 8-cycle cap. Fixed overnight: #118, #124, #126, #130, #139, #105, #106. Not started: **#107, #109 (both P0)**, #111 to #114, #144. I can't restart it from here (it runs on Ben's laptop).
- Finder still running (cycle 4 at 4:38, seed 97704: goal bucket 78, no surplus 154/204). New: #144 (P1, no-surplus gap chip says "needs $209 and gets $0" with no next step).
- AI auditor stopped at 3:13 (cap used).

**Morning decision for Ben:** start a builder session at 7:45 on #109 then #107 (rules are in SPROUT.md v3.3; bug fixes are allowed after the 9:00 freeze), or leave them: the demo personas (Maya, Jordan) don't hit either bug.

### 6:35 AM (lead wake 4)
**Verified by the lead on `main` d5991c7 (AI off):** build and lint pass; check-engine, check-overview, check-chat, scenarios pass; stress **0 failing invariants, 0 chat/API problems, 0 crashes** on seed 9707 and on a fresh seed 4242 (514 users) the agents never used. Maya unchanged at $80 / $33 / $129.

**After Ben's 5:32 "continue" (agent reports):** the Fixer merged #148 (#107), #149 (#109), #150 (#112), #151 (#113), #152 (#114), #153 (#144); the auditor merged #147 (plan prompt example now $129, no API calls); the Finder ran cycle 6 (0 failing invariants) and stopped at 6:15 with night totals: 3,084 plans, 4,375 Ask Sprout template answers, 306 API calls, 0 crashes.

**Lead decision (#111, Ben may override):** keep the DASHBOARD v2 step order. The chosen habit already shows on the Overview as its goal line ("Credit building: costs time, not money. Start by checking your free credit report."), and changing steps 3 and 4 would change Maya's demo, the deck slide and the video script 3 hours before the freeze. Closed.

**Production:** NOT current. The live site is `157cf43` (has the new Maya numbers, not the 5:34+ fixes). Every `main` deploy since 5:34 is "rate limited, retry in 24 hours". Ben's 7:40 Redeploy step stands.

**Open:** #115 (tap targets under 24 px; styling, Ethan's). Nothing else open from the overnight run.
