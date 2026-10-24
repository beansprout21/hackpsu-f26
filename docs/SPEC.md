# Product Spec v2

Status: **v2 APPROVED Sat 3:15 PM** (v1 1:48 PM). User flow: [FigJam board](https://www.figma.com/board/ZgPLzfLJVNJebjGwW87qAe). Product name: **Sprout** (the app, the advisor, and the mascot share the name; do not use FNB's logo or trademarks in the UI, label the app "Prototype built for FNB").

## One-liner
> Other banks start with your credit score. FNB starts with your life.

## Tracks targeted
Grand Prize, FNB Challenge (primary judge), Nittany AI Challenge, MLH Best Use of Auth0.

## Problem
College students and young families have more financial information than ever and less confidence. They do not know which products fit their goals, distrust being sold to, and feel like they are drowning in costs. Banks start the conversation with credit scores and product lists, not with what the customer wants their life to look like.

## Target users
1. **College student (HERO):** often no steady job. Money arrives as summer savings, aid refunds, scholarships, family support, work-study, gigs. $0/month steady income is a valid, common case.
2. **Young family (contrast persona):** steady income, first home within ~5 years.

## Sprout, the agent
- Named advisor with a supportive, optimistic, plain-spoken voice. Never shames spending; celebrates small wins; always gives a concrete next step.
- Cute mascot (AI-generated image by Ethan, 2 expressions: happy, thinking). Placeholder avatar until ready.
- **Advice boundary:** budgeting, saving, credit building, and FNB products/programs only. For investing or taxes Sprout says: "When you're ready for that, an FNB advisor can help" and stops.
- Method inspired by *I Will Teach You to Be Rich*: rich life first, then numbers, spending plan buckets, automation, big wins over small cuts. Credited in Devpost; no book text or branding in the app.

## Who it serves at FNB
Every completed plan is a **warm lead with context**: a banker sees the customer's goals, timeline, and finances before the first conversation. Existing customers get a plan built on products they can open now; prospects get a reason to trust FNB first.

## Core demo flow (target: 90 seconds live; matches the FigJam board)
1. **Meet Sprout:** landing with the one-liner, Sprout greets.
2. **Dreams:** swipe value cards (6 to 10, e.g. "Backpack Japan" vs "Build a safety cushion") -> **persona reveal** ("You're an Experience Collector" for Maya) -> place 1 to 3 goals on an interactive timeline -> pick the why for each.
3. **Login (Auth0)** to save progress. Comes after dreams, so users invest before signing up.
4. **Money snapshot:** "Steady income?" Yes -> monthly income. No/irregular -> lump sums (summer savings, aid refund per semester, family, scholarships). Then costs, savings, credit range (self-reported), FNB customer yes/no. Persona prefill buttons. "Connect your bank (coming soon, via Plaid)" disabled.
5. **Sprout builds the plan:** loading states narrated by Sprout.
6. **Plan page (hero):**
   - **Step one** first: one action doable this week, usually $0 (e.g. open FNB Student Checking: no monthly fee, no minimum).
   - Sprout's 2-sentence intro + persona + rich life statement.
   - **Spending plan:** effective monthly income (math shown) split into fixed costs, emergency fund, goal savings, guilt-free.
   - **Interactive timeline:** Start here (now) -> Next -> Unlocks later. Later items unlock on money thresholds, credit, or **life events** (first paycheck, internship, graduation).
   - Product cards with the trust layer; habit and budget steps alongside products.
   - **"Not yet" card** and the **Book with an FNB banker** action.
7. **Ask Sprout "why?" / "what if?"** (P1).

**Proof moment for judges:** re-run Maya with opposite swipes. Same finances, different persona, plan, and roadmap. Then show Jordan briefly as the young-family contrast.

## Must-have (P0)
- Swipe intake + persona reveal + goals on timeline, snapshot with income sources, persona prefill.
- Auth0 login gating snapshot and plan.
- AI Goal Profile extraction (`/api/profile`).
- Deterministic matching + plan math against the FNB catalog, AI-written explanations and steps (`/api/plan`).
- Plan page: Step one, spending plan, now/next/later timeline, trust layer, "not yet" card, banker CTA, Sprout voice.
- Deployed on Vercel with a public URL.
- AI fallback: if an AI call fails or times out (15s), the plan still renders using deterministic engine output and template explanations.

## Nice-to-have (P1)
- Chat panel (`/api/chat`).
- Side-by-side persona comparison view.
- Catalog "last verified" refresh demo (re-fetch 1 to 2 product pages).
- ElevenLabs voice readout of the plan (MLH prize).

## Out of scope
Banker view (deferred until MVP is polished), real bank connections (Plaid is "future plans"), storing real financial data in a database, real credit pulls, any FNB branding or logos, investment advice.

## Key product rules
1. **Never invent products, rates, or fees.** The AI may only reference product IDs from `src/data/catalog.json`. The server rejects any unknown ID. Unpublished rates display as "Check current rate with FNB".
2. **Stage everything.** Foundation first (everyday banking, emergency fund), bigger moves later with explicit unlock conditions. Method inspired by *I Will Teach You to Be Rich* (credited in Devpost; no book text or branding in the app).
3. **Restraint is a feature.** The engine must produce at least one "not yet" item whenever the user lacks a 3-month emergency fund or the goal horizon is longer than the product makes sense for.
4. **Show the math.** Effective monthly income (monthly x1, per semester /4, one-time /9) minus fixed costs minus debt payments = surplus. Allocation never exceeds surplus. Displayed on the page.
5. **Educational, not advice.** Disclaimer on snapshot and plan pages: "Educational prototype. Not financial advice. No data is stored."
6. Credit band filters eligibility (e.g., SmartSecured card fits "building"/"unsure").

## Architecture
- Next.js App Router + TypeScript strict + Tailwind + shadcn/ui, deployed on Vercel.
- Client state: React context persisted to `sessionStorage` (intake answers, snapshot, profile, plan). No database.
- Server: route handlers under `src/app/api/**`, Anthropic SDK, model from `ANTHROPIC_MODEL`.
- Matching engine (deterministic, `src/lib/server/engine/`): scores each catalog product per goal (goal fit, eligibility, affordability, priority), computes allocation and timeline. AI receives engine output and writes the rich life statement, explanations, and step wording; it does not choose scores.
- Auth: Auth0 via `@auth0/nextjs-auth0`.
- Allowed new dependencies: `@anthropic-ai/sdk`, `zod`, `@auth0/nextjs-auth0`, shadcn/ui and its deps, `lucide-react`. Anything else: ask first.

## Judging criteria mapping
| Criterion | How we hit it |
|---|---|
| Implementation | Deployed, end-to-end flow works for two personas, AI fallback |
| Clarity | One-liner, 90-second flow, side-by-side persona proof |
| Creativity | Goals-first matching, "not yet" restraint, banker handoff with context |
| Growth | Auth0, agentic coordination workflow, first financial-product engine (document in Devpost) |
| Impact | Cited stats on young-adult financial stress + FNB judge's own framing; warm-lead value for FNB |
| FNB rubric | Information to understanding (explanations) to confidence (trust layer) to action (banker CTA) |
| Nittany AI | Remove the AI and there is no Goal Profile, no rich life statement, no explanations |

## Timeline
| Time | Milestone |
|---|---|
| Sat 2:00 PM | Scaffold + deploy (#1). Contracts frozen. |
| Sat 6:00 PM | Intake + snapshot pages on mocks; engine working on fixtures |
| Sat 11:00 PM | End-to-end flow live with real AI. **Devpost project created by 11:59 PM.** |
| Sun 9:00 AM | Feature freeze. Polish, fallback testing. |
| Sun 10:00 to 11:30 AM | Record 5-minute video, finish Devpost write-up |
| Sun 12:00 PM | Submission complete on Devpost AND hackpsu.org |
