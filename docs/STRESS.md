# Stress test (#97)

Run after #94, #95 and #96 merged (main at `48cd75d`, Sun Oct 25). Ben's builder agent, local clone, `AI_DISABLED=1` and `DEMO_AUTH_BYPASS=1`.

```bash
AI_DISABLED=1 DEMO_AUTH_BYPASS=1 npx --yes tsx scripts/stress.ts --live --out stress-report.md
```

The deterministic part (314 users, 744 chat answers, 51 API calls) runs in about 1 second (target < 2 minutes). `--live` adds 10 users with the real AI when `ANTHROPIC_API_KEY` is set.

## Not run in this pass

- **Live-AI chat (10 users):** no Anthropic key in this clone. Ben's human chose to report it as not run. The harness supports it (`--live`).
- **Share → banker → Stop sharing with real storage:** no Upstash credentials. Share shows "Sharing is unavailable right now" and `/banker` shows its unavailable notice. Both are correct, but the real round trip is untested.
- **Screenshots:** the app's browser pane was hidden for most of the pass, so pages were read as text and DOM. Visual checks were limited to a layout scan at 375 px (horizontal overflow, tap-target sizes).

## Crash fixed in this PR

- **`src/proxy.ts`:** `proxy()` called `auth0.middleware()` before checking `DEMO_AUTH_BYPASS`. With no Auth0 config (a fresh clone, or a preview without env vars), **every page and API returned 500** (`DomainResolutionError`), including under the emergency demo switch. Now the bypass branch returns before touching Auth0, except on `/auth/*`. Behavior with bypass off is unchanged.
  - **Test:** `npx tsx scripts/check-proxy.ts` (6 paths, no Auth0 env). It failed 6/6 before the fix and passes 6/6 after.

## Issues opened (one per distinct bug, `owner:ben,status:ready`)

| # | Severity | Problem |
|---|---|---|
| #104 | high | 3 matches under the safety cushion fail `PlanSchema`, so Ask Sprout and Share return 400 (10/314 users) |
| #105 | high | Duplicate goal ids pass `IntakeAnswersSchema` and produce a plan the APIs reject |
| #106 | high (demo) | Demo Maya shows $80 / $33 / $129 vs the golden $91 / $22 / $118, depending on the entry path |
| #107 | medium | Habits only: the "Goals" bucket gets money with no money goal (41/314) |
| #108 | medium | Ask Sprout templates say "32 months" / "682 months" instead of years (38/744 answers) |
| #109 | medium | No surplus: deposit products still recommended now/next (118/132) |
| #110 | low | "emergency fund" in engine explanations (voice rule: "safety cushion") |
| #111 | low | A chosen habit can fall outside the Overview's 4 guide steps |
| #112 | low | Intake cushion estimate: "a student's basic costs" for families; the amount is ignored |
| #113 | low | Landing preview says "Open an everyday account" |
| #114 | low | "What if I give it more time?" repeats the gap answer |
| #115 | low | Tap targets under 24 px at 375 px |

## Harness results (seed 9707, 314 users: 14 edge cases + 300 generated)

Timing: engine + Overview 197 ms, chat 34 ms (744 answers), APIs 404 ms, total 635 ms.

| Invariant | Pass | Fail |
| --- | --- | --- |
| intake is contract-valid (fixture sanity) | 314 | 0 |
| no crash (profile, engine, Overview) | 314 | 0 |
| plan is schema-valid | 304 | **10** |
| no NaN / Infinity / negative money | 314 | 0 |
| allocation <= surplus | 314 | 0 |
| buckets sum to income | 182 | 0 |
| goal bucket lands on money goals | 273 | **41** |
| cushion = max($1,000, 3 x costs) | 314 | 0 |
| no habit allocation | 314 | 0 |
| no student loans | 314 | 0 |
| every product id is in the catalog | 314 | 0 |
| Step one matches rule D | 314 | 0 |
| no "10+ years" | 314 | 0 |
| no duplicate or emergency-fund goal lines | 314 | 0 |
| every Overview string non-empty | 314 | 0 |
| no banned voice words | 314 | 0 |
| unlock condition on every later item | 314 | 0 |
| step-by-step guide well-formed | 314 | 0 |
| habit goal lines have no dollar amounts | 314 | 0 |
| months/years strings match the numbers | 314 | 0 |
| month block matches the plan | 314 | 0 |
| no surplus: only $0 products now/next | 14 | **118** |

### Smallest failing case per invariant

**plan is schema-valid** (10; e.g. edge-duplicate-goal-ids, gen-040, gen-113, gen-138, gen-140, gen-164, ...)

- gen-140: [{"code":"custom","path":["matches"],"message":"max 2 matches per goal (emergency_fund has 3)"}]

Distinct shapes:

- 9 x [{"code":"custom","path":["matches"],"message":"max N matches per goal (emergency_fund has N)"}]
- 1 x [{"code":"custom","path":["matches"],"message":"max N matches per goal (travel has N)"}]

```json
{"intake":{"lifeStage":"student","swipes":"6 cards","values":["family","growth"],"goals":[{"id":"emergency_fund","priority":1,"horizonMonths":42,"why":"because it matters to me"},{"id":"everyday_banking","priority":2,"horizonMonths":56,"why":""}]},"snapshot":{"hasSteadyIncome":false,"incomeSources":[{"kind":"job","amount":20804,"frequency":"per_semester"}],"monthlyFixedCosts":6718,"monthlyDebtPayments":0,"savingsBalance":0,"creditBand":"building","isFnbCustomer":false}}
```

**goal bucket lands on money goals** (41; e.g. edge-habits-only, edge-duplicate-goal-ids, gen-010, gen-021, gen-037, gen-038, ...)

- gen-244: goal bucket $519, money-goal allocations $0, goals: everyday_banking

Distinct shapes:

- 13 x goal bucket $N money-goal allocations $N goals: credit_building, everyday_banking
- 10 x goal bucket $N money-goal allocations $N goals: everyday_banking
- 9 x goal bucket $N money-goal allocations $N goals: credit_building
- 8 x goal bucket $N money-goal allocations $N goals: everyday_banking, credit_building
- 1 x goal bucket $N money-goal allocations $N goals: travel, travel

```json
{"intake":{"lifeStage":"new_grad","swipes":"7 cards","values":["family"],"goals":[{"id":"everyday_banking","priority":1,"horizonMonths":72,"why":""}]},"snapshot":{"hasSteadyIncome":false,"incomeSources":[{"kind":"gig","amount":6488,"frequency":"monthly"}],"monthlyFixedCosts":966,"monthlyDebtPayments":658,"savingsBalance":0,"creditBand":"building","isFnbCustomer":false}}
```

**no surplus: only $0 products now/next** (118; e.g. edge-no-income, edge-income-equals-costs, gen-002, gen-004, gen-005, gen-006, ...)

- gen-195: now firstrate-savings ($50 to open), next certificates-of-deposit ($500 to open)

Distinct shapes:

- 19 x now freestyle-checking ($N to open)
- 9 x now firstrate-savings ($N to open)
- 8 x now freestyle-checking ($N to open), now firstrate-savings ($N to open)
- 6 x next savers-goal-cd ($N to open)
- 4 x next savers-goal-cd ($N to open), now firstrate-savings ($N to open)
- 4 x next free-small-business-checking ($N to open), now firstrate-savings ($N to open)
- 4 x now freestyle-checking ($N to open), next certificates-of-deposit ($N to open)
- 4 x next free-small-business-checking ($N to open), now freestyle-checking ($N to open)
- 4 x next smartsecured-card ($N to open)
- 3 x next free-small-business-checking ($N to open)

```json
{"intake":{"lifeStage":"young_family","swipes":"7 cards","values":["experiences","security","simplicity"],"goals":[{"id":"education","priority":1,"horizonMonths":62,"targetAmount":100,"why":""}]},"snapshot":{"hasSteadyIncome":true,"incomeSources":[],"monthlyFixedCosts":26,"monthlyDebtPayments":0,"savingsBalance":0,"creditBand":"excellent","isFnbCustomer":true}}
```

### Observation: loan products in the first 4 guide steps

- auto-loan (auto_loan): 23 users
- cashplease (personal_loan): 14 users
- secured-installment-loan (personal_loan): 13 users
- unsecured-line-of-credit (personal_loan): 4 users

### Ask Sprout (20 users, templates; live AI: skipped: no ANTHROPIC_API_KEY (or AI_DISABLED=1))

744 answers, 38 problems.

Distinct shapes:

- 32 x goal_gap: "N months" should be years
- 2 x why_cushion: "N months" should be years
- 2 x when_unlock: "N months" should be years
- 2 x free: "N months" should be years

| User | Intent | Problem |
| --- | --- | --- |
| edge-maya | goal_gap:travel | "28 months" should be years \| answer: "Your travel fund needs $209 a month and gets $91, so it's $118 a month away. Move $118 from guilt-free and you'd still have $139 for fun. Or give it 28 months a" |
| edge-maya | goal_gap:travel | "28 months" should be years \| answer: "Your travel fund needs $209 a month and gets $91, so it's $118 a month away. Move $118 from guilt-free and you'd still have $139 for fun. Or give it 28 months a" |
| edge-maya | goal_gap:first_home | "682 months" should be years \| answer: "Your home fund needs $179 a month and gets $22, so it's $157 a month away. Give it 682 months at your current pace. Or aim for $1,848 on your current timeline." |
| edge-jordan | goal_gap:first_home | "100 months" should be years \| answer: "Your home fund needs $250 a month and gets $150, so it's $100 a month away. Move $100 from guilt-free and you'd still have $275 for fun. Or give it 100 months a" |
| edge-jordan | goal_gap:first_home | "100 months" should be years \| answer: "Your home fund needs $250 a month and gets $150, so it's $100 a month away. Move $100 from guilt-free and you'd still have $275 for fun. Or give it 100 months a" |
| gen-000 | goal_gap:travel | "36 months" should be years \| answer: "Your travel fund is on track: $489 a month gets you there in 36 months." |
| gen-001 | goal_gap:travel | "77 months" should be years \| answer: "Your travel fund is on track: $153 a month gets you there in 77 months." |
| gen-001 | goal_gap:first_home | "25 months" should be years \| answer: "Your home fund is on track: $614 a month gets you there in 25 months." |
| gen-001 | goal_gap:travel | "77 months" should be years \| answer: "Your travel fund is on track: $153 a month gets you there in 77 months." |
| gen-003 | goal_gap:education | "33 months" should be years \| answer: "Your education fund needs $400 a month and gets $61, so it's $339 a month away. Give it 33 months at your current pace. Or aim for $305 on your current timeline" |
| gen-003 | goal_gap:travel | "26 months" should be years \| answer: "Your travel fund is on track: $249 a month gets you there in 26 months." |
| gen-003 | goal_gap:first_home | "174 months" should be years \| answer: "Your home fund needs $216 a month and gets $103, so it's $113 a month away. Move $113 from guilt-free and you'd still have $301 for fun. Or give it 174 months a" |
| gen-003 | goal_gap:education | "33 months" should be years \| answer: "Your education fund needs $400 a month and gets $61, so it's $339 a month away. Give it 33 months at your current pace. Or aim for $305 on your current timeline" |
| gen-007 | goal_gap:family | "69 months" should be years \| answer: "Your family fund needs $150 a month and gets $132, so it's $18 a month away. Give it 69 months at your current pace. Or aim for $7,920 on your current timeline." |
| gen-007 | why_cushion | "32 months" should be years \| answer: "Your safety cushion is $17,658: 3 months of your $5,886 in monthly bills. If money stops coming in for a while, your rent and bills are still covered. At $185 a" |
| gen-007 | goal_gap:family | "69 months" should be years \| answer: "Your family fund needs $150 a month and gets $132, so it's $18 a month away. Give it 69 months at your current pace. Or aim for $7,920 on your current timeline." |
| gen-007 | when_unlock:fnb-home-ownership-program:first_home | "96 months" should be years \| answer: "The Home Ownership Program unlocks when you have a full-time job and your $17,658 safety cushion is full. You have $0 saved, so you're $17,658 away: about 96 mo" |
| gen-007 | why_cushion | "32 months" should be years \| answer: "Your safety cushion is $17,658: 3 months of your $5,886 in monthly bills. If money stops coming in for a while, your rent and bills are still covered. At $185 a" |
| gen-007 | when_unlock:fnb-home-ownership-program | "96 months" should be years \| answer: "The Home Ownership Program unlocks when you have a full-time job and your $17,658 safety cushion is full. You have $0 saved, so you're $17,658 away: about 96 mo" |
| gen-007 | goal_gap:family | "69 months" should be years \| answer: "Your family fund needs $150 a month and gets $132, so it's $18 a month away. Give it 69 months at your current pace. Or aim for $7,920 on your current timeline." |
| gen-007 | goal_gap:first_home | "278 months" should be years \| answer: "Your home fund needs $132 a month and gets $54, so it's $78 a month away. Give it 278 months at your current pace. Or aim for $6,156 on your current timeline." |
| gen-007 | goal_gap:credit_building | "32 months" should be years \| answer: "Your plan starts with one step: Move $20 into your family fund right now. You have $743 a month of breathing room, and that's a real start. $185 a month covers " |
| gen-007 | free | "32 months" should be years \| answer: "Your plan starts with one step: Move $20 into your family fund right now. You have $743 a month of breathing room, and that's a real start. $185 a month covers " |
| gen-007 | free | "32 months" should be years \| answer: "Your plan starts with one step: Move $20 into your family fund right now. You have $743 a month of breathing room, and that's a real start. $185 a month covers " |
| gen-009 | goal_gap:first_home | "24 months" should be years \| answer: "Your home fund needs $6,600 a month and gets $284, so it's $6,316 a month away. Give it 24 months at your current pace. Or aim for $284 on your current timeline" |
| gen-009 | goal_gap:first_home | "24 months" should be years \| answer: "Your home fund needs $6,600 a month and gets $284, so it's $6,316 a month away. Give it 24 months at your current pace. Or aim for $284 on your current timeline" |
| gen-009 | goal_gap:travel | "89 months" should be years \| answer: "Your travel fund needs $169 a month and gets $118, so it's $51 a month away. Move $51 from guilt-free and you'd still have $3,140 for fun. Or give it 89 months " |
| gen-009 | goal_gap:small_business | "237 months" should be years \| answer: "Your business fund needs $227 a month and gets $70, so it's $157 a month away. Move $157 from guilt-free and you'd still have $3,034 for fun. Or give it 237 mon" |
| gen-009 | goal_gap:first_home | "24 months" should be years \| answer: "Your home fund needs $6,600 a month and gets $284, so it's $6,316 a month away. Give it 24 months at your current pace. Or aim for $284 on your current timeline" |
| gen-009 | goal_gap:travel | "89 months" should be years \| answer: "Your travel fund needs $169 a month and gets $118, so it's $51 a month away. Move $51 from guilt-free and you'd still have $3,140 for fun. Or give it 89 months " |
| gen-009 | goal_gap:small_business | "237 months" should be years \| answer: "Your business fund needs $227 a month and gets $70, so it's $157 a month away. Move $157 from guilt-free and you'd still have $3,034 for fun. Or give it 237 mon" |
| gen-013 | goal_gap:small_business | "95 months" should be years \| answer: "Your business fund is on track: $124 a month gets you there in 95 months." |
| gen-013 | goal_gap:small_business | "95 months" should be years \| answer: "Your business fund is on track: $124 a month gets you there in 95 months." |
| gen-015 | goal_gap:travel | "2800 months" should be years \| answer: "Your travel fund needs $2,400 a month and gets $6, so it's $2,394 a month away. Give it 2800 months at your current pace. Or aim for $42 on your current timelin" |
| gen-015 | goal_gap:travel | "2800 months" should be years \| answer: "Your travel fund needs $2,400 a month and gets $6, so it's $2,394 a month away. Give it 2800 months at your current pace. Or aim for $42 on your current timelin" |
| gen-015 | goal_gap:education | "500 months" should be years \| answer: "Your education fund needs $36 a month and gets $2, so it's $34 a month away. Give it 500 months at your current pace. Or aim for $56 on your current timeline." |
| gen-015 | goal_gap:travel | "2800 months" should be years \| answer: "Your travel fund needs $2,400 a month and gets $6, so it's $2,394 a month away. Give it 2800 months at your current pace. Or aim for $42 on your current timelin" |
| gen-015 | goal_gap:education | "500 months" should be years \| answer: "Your education fund needs $36 a month and gets $2, so it's $34 a month away. Give it 500 months at your current pace. Or aim for $56 on your current timeline." |

### API route handlers (51 calls, 0 problems)

| Route | Case | Status | OK | Note |
| --- | --- | --- | --- | --- |
| POST /api/profile | not JSON | 400 | yes |  |
| POST /api/plan | not JSON | 400 | yes |  |
| POST /api/chat | not JSON | 400 | yes |  |
| POST /api/share | not JSON | 503 | yes |  |
| POST /api/profile | empty object | 400 | yes |  |
| POST /api/plan | empty object | 400 | yes |  |
| POST /api/chat | empty object | 400 | yes |  |
| POST /api/share | empty object | 503 | yes |  |
| POST /api/profile | wrong types | 400 | yes |  |
| POST /api/plan | wrong types | 400 | yes |  |
| POST /api/chat | wrong types | 400 | yes |  |
| POST /api/share | wrong types | 503 | yes |  |
| POST /api/profile | 6 money goals | 400 | yes |  |
| POST /api/plan | 6 money goals | 400 | yes |  |
| POST /api/chat | 6 money goals | 400 | yes |  |
| POST /api/share | 6 money goals | 503 | yes |  |
| POST /api/profile | 4 habits | 400 | yes |  |
| POST /api/plan | 4 habits | 400 | yes |  |
| POST /api/chat | 4 habits | 400 | yes |  |
| POST /api/share | 4 habits | 503 | yes |  |
| POST /api/profile | negative money | 200 | yes |  |
| POST /api/plan | negative money | 400 | yes |  |
| POST /api/chat | negative money | 400 | yes |  |
| POST /api/share | negative money | 503 | yes |  |
| POST /api/profile | Infinity (1e400) | 200 | yes |  |
| POST /api/plan | Infinity (1e400) | 400 | yes |  |
| POST /api/chat | Infinity (1e400) | 400 | yes |  |
| POST /api/share | Infinity (1e400) | 503 | yes |  |
| POST /api/profile | horizon 0 | 400 | yes |  |
| POST /api/plan | horizon 0 | 400 | yes |  |
| POST /api/chat | horizon 0 | 400 | yes |  |
| POST /api/share | horizon 0 | 503 | yes |  |
| POST /api/profile | huge strings | 400 | yes |  |
| POST /api/plan | huge strings | 400 | yes |  |
| POST /api/chat | huge strings | 400 | yes |  |
| POST /api/share | huge strings | 503 | yes |  |
| POST /api/chat | 7 history turns | 400 | yes |  |
| POST /api/chat | question 501 chars | 400 | yes |  |
| POST /api/chat | unknown intent | 400 | yes |  |
| POST /api/profile | valid | 200 | yes |  |
| POST /api/plan | valid | 200 | yes |  |
| POST /api/chat | valid | 200 | yes |  |
| GET /api/share | no storage configured | 503 | yes |  |
| DELETE /api/share | no storage configured | 503 | yes |  |
| GET /api/banker/plans | no storage configured | 503 | yes |  |
| GET /api/banker/plans/[id] | unknown id | 503 | yes |  |
| POST /api/extract | JSON instead of multipart | 400 | yes |  |
| POST /api/extract | no file field | 400 | yes |  |
| POST /api/extract | text/plain file | 400 | yes |  |
| POST /api/extract | over 4 MB | 400 | yes |  |
| POST /api/extract | PNG with AI off | 503 | yes |  |

## Browser pass

Local dev server, `DEMO_AUTH_BYPASS=1`, `AI_DISABLED=1`, in-app browser at 1280×800, plus a 375×812 layout scan. All five users completed intake → snapshot → plan with no crash after the proxy fix.

| User | Path | Result |
|---|---|---|
| Maya | /intake "Use Maya" → 9 steps → /snapshot "Try a sample statement" → "Fill in as Maya" → Build | Plan OK: Experience Collector, Step one D5, the guide, the month line with fixed costs, cushion $1,950, habit line. Numbers $80 / $33 / $129 (#106). Chips: "How do I close the $129 gap" → "32 months" (#108); "more time" repeats the answer (#114). Save PDF calls `window.print()`. Book opens fnb-online.com/schedule-an-appointment. |
| Opposite swipes | /snapshot "Maya, opposite swipes" → Build | Safety Builder, Step one D4 "Move $20 into savings", cushion $135/mo (60/40 tilt), a visibly different plan. Numbers $91 / $18 (persona priorities, #106). |
| Jordan | /intake "Use Jordan" → /snapshot "Fill in as Jordan" → Build | Safety Builder, Step one D4, cushion $4,950, Freestyle Checking, home gap $100. Step 3 says "emergency fund goal" (#110). Intake cushion estimate $2,000 "a student's basic costs" (#112). |
| No income | intake + snapshot seeded (no income, $400 fixed, $100 saved) → Build | Step one D1, "Right now your costs use everything coming in", no lever. Step 3 still "Open Savers Goal CD" ($100 to open) (#109). |
| Habits only | credit_building + everyday_banking, $900/mo, $500 fixed → Build | Step one D2 with the annualcreditreport.com link, the alerts habit as step 3, habit goal lines OK. Month bar "Goals $90" and headline "$90 a month toward your savings goal" with no goal (#107). |

**375 px scan** (`/`, `/intake`, `/snapshot`, `/plan`, `/banker`): no horizontal overflow on any page. Small tap targets are listed in #115.

### Smaller notes (not filed)

- **Upload:** the snapshot upload with AI unavailable shows "Upload is unavailable right now. You can type your numbers below." It's graceful, but the file picker disappears with no retry.
- **Empty snapshot:** before any input, the snapshot already says "Your costs use up your income right now", which reads alarming when nothing is entered yet.
- **"AI" badge:** Ask Sprout shows an "AI" badge even when answers are templates (AI off).
- **Loader live region:** after the plan loads, the plan-building loader's text stays in a `role="status"` live region, so screen readers may announce it.
- **`/auth/profile` in bypass mode:** with no Auth0 config, the header's `/auth/profile` polling still returns 500 and the "Log in" link can't work. Expected for a clone without Auth0; production is unaffected.
- **Habit horizon:** the intake shows habits with a horizon ("Build my credit, in 12 months · Costs time, not money"); harmless.

### Observation for Ben (not a rule violation)

Loan products reach the first 4 guide steps for some generated users: auto loan (23), CashPlease (14), secured installment loan (13), unsecured line of credit (4). The rules only forbid student loans, so this is a question, not a bug.

## Overnight loop (#119)

Each cycle runs `STRESS_SEED=<new seed> STRESS_USERS=500 AI_DISABLED=1 DEMO_AUTH_BYPASS=1 npx --yes tsx scripts/stress.ts`, a browser pass for one persona (dev server on port 3003, `DEMO_AUTH_BYPASS=1`, `AI_DISABLED=1`), and the live-AI sample when a key is present. This clone has no `ANTHROPIC_API_KEY`, so the live-AI sample is skipped and reported as 0 calls.

### Cycle 1 (2:22 AM ET, seed 9334)

- **Harness:** 514 users (500 generated + 14 edge), 1.1 s, 0 crashes, 0 API problems (51 calls).
  - plan is schema-valid: 11 fail (#104: 10 cushion with 3 matches, 1 duplicate ids #105)
  - goal bucket lands on money goals: 60 fail (#107, all habits-only)
  - no surplus: only $0 products now/next: 190 of 206 fail (#109)
  - Ask Sprout templates: 17 of 755 answers say raw months ≥ 24 (#108)
- **Browser (Maya, 1280 + 375 px):** intake "Use Maya" → snapshot "Fill in as Maya" → plan → chips "Why is this my first move?", "How did you split my money?" → Save PDF (`print()` called). No new problems.
  - Numbers $80 / $33 / $129 (#106).
  - The split answer is correct (64 words).
  - 375 px: no overflow, 4 guide steps. "See it at FNB" and "Banker view (demo)" are under 24 px (#115).
- **Live AI:** skipped (no key). Cumulative: 0 plans, 0 chats.
- **Issues:** no new signatures. New reproductions commented on #104, #107, #108, #109.

### Cycle 2 (3:06 AM ET, seed 83923, main `6f4e26c`)

- **Main moved 10 commits:** #122 (no consumer loans), #127 (cushion wording, years), #129 (max 2 matches per goal), and #121 AI audit cycles 1–6.
- **Harness:** 514 users, 0.6 s, 0 crashes, 0 API problems. New check: "safety cushion", never "emergency fund" in user-facing text.
  - plan is schema-valid: **0** fail (was 11): #104 verified fixed
  - "safety cushion" wording: 0 fail: #110 verified fixed
  - Ask Sprout templates: **0** of 734 with raw months (was 17): #108 verified fixed
  - Loan products in the guide: none (#122)
  - goal bucket lands on money goals: 69 fail (#107, plus the duplicate-id case #105)
  - no surplus: only $0 products now/next: 184 of 203 fail (#109)
- **Browser (Maya opposite swipes, 1280 + 375 px):** snapshot shortcut → plan → gap chip → Save PDF (`print()` called).
  - Safety Builder, Step one D4, cushion $135/mo.
  - Chat now says "give it 3 years" (#108 nit: no "about").
  - 375 px: no overflow.
- **Live AI:** skipped (no key). Cumulative: 0 plans, 0 chats.
- **Issues:** none opened. Updated #104, #105, #107, #108, #109, #110.

### Cycle 3 (3:52 AM ET, seed 91945, main `79dfb7d`)

- **Main moved 4 commits:** SPROUT v3.3 rules (#138, docs), #130 fix (no IRA; no card or CardGuard for the cushion), and #121 AI audit cycles 7–8.
- **Harness:** invariants updated to the exact v3.3 rules for #107, #109 and #130. 514 users, 0.6 s, 0 crashes, 0 API problems.
  - no IRA; no card, loan or CardGuard for the cushion: **0** fail (111 before the #130 fix): #130 verified
  - goal bucket lands on money goals (v3.3): 68 fail; 67 of them also say "your savings goal" (#107, no engine change yet)
  - no surplus: only $0 products now/next (v3.3): 163 of 199 fail (#109, no engine change yet). Includes 23 `student-checking` with a `null` deposit; question raised on #109.
  - Ask Sprout templates: 703 answers, 0 problems
- **Browser (Jordan, 1280 + 375 px):** intake "Use Jordan" → "Fill in as Jordan" → plan → "When can I get the Home Ownership Program?" → Save PDF.
  - Step 3 now says "safety cushion goal" (#110 fixed in the UI).
  - Intake still shows "$2,000 … a student's basic costs" (#112).
  - New: the chat says "Meanwhile, Mortgage calculators gets you ready" (**#139**, P1).
  - 375 px: no overflow.
- **Live AI:** skipped (no key). Cumulative: 0 plans, 0 chats.
- **Issues:** opened #139. Updated #107, #109, #112, #130.
