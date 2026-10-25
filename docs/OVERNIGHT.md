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
8. **11:30 Devpost update** (lead does it, Ben approves): new video link; story numbers (Ask Sprout example currently says "$140 from guilt-free"; replace with the confirmed gap); add 3 to 5 gallery screenshots (Overview, step guide, Ask Sprout, banker view, persona reveal) at 3:2; check built-with and links.
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
