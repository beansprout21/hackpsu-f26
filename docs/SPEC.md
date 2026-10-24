# Product Spec v1

Status: **APPROVED Sat 1:48 PM.** Working name: **Waypoint** (placeholder, rename anytime; do not use FNB's logo or trademarks in the UI, label the app "Prototype built for FNB").

## One-liner
> Other banks start with your credit score. FNB starts with your life.

## Tracks targeted
Grand Prize, FNB Challenge (primary judge), Nittany AI Challenge, MLH Best Use of Auth0.

## Problem
College students and young families have more financial information than ever and less confidence. They do not know which products fit their goals, distrust being sold to, and feel like they are drowning in costs. Banks start the conversation with credit scores and product lists, not with what the customer wants their life to look like.

## Target users
1. **College student** (primary demo persona): low income, part-time job, wants to travel and build credit.
2. **Young family**: dual or single income, wants a first home within ~5 years.

## Who it serves at FNB
Every completed plan is a **warm lead with context**: a banker sees the customer's goals, timeline, and finances before the first conversation. Existing customers get a plan built on products they can open now; prospects get a reason to trust FNB first.

## Core demo flow (target: 90 seconds live)
1. **Landing:** one-liner, "Find your Waypoint" button.
2. **Goal intake (cards):** life stage, what matters (values), goals with "why" and "when". Tap-to-choose, one optional free-text "describe your rich life" field.
3. **Login (Auth0)** to save the plan.
4. **Financial snapshot:** monthly income, fixed costs, debt payments, savings, credit range (self-reported), FNB customer yes/no. Persona prefill buttons. "Connect your bank (coming soon, via Plaid)" disabled button.
5. **Plan generation:** loading states "Understanding your goals" then "Matching FNB products".
6. **Plan page (hero):**
   - Rich life statement (AI, in the user's own words).
   - Monthly allocation across goals with surplus math visible.
   - **Staged roadmap:** "Start here" (now), "Next", "Unlocks later". Later items show their unlock condition, so the user sees a path, not a rejection.
   - Timeline of steps with dates.
   - Product match cards, each with the **trust layer**: why it fits your goal, terms to know, score breakdown, confidence, source link + verified date.
   - **"Not yet" card**: what the agent deliberately does NOT recommend yet and why (e.g., build emergency fund before mortgage pre-approval).
   - **"Book with an FNB banker"** button: copies plan summary + opens FNB's appointment page.
7. **Ask "why?" / "what if?" chat panel** on the plan page (P1).

**Proof moment for judges:** two personas with the same finances but different goals produce visibly different plans. Demo both side by side or back to back.

## Must-have (P0)
- Goal intake cards, snapshot form, persona prefill.
- Auth0 login gating snapshot and plan.
- AI Goal Profile extraction (`/api/profile`).
- Deterministic matching + plan math against the FNB catalog, AI-written explanations and steps (`/api/plan`).
- Plan page with trust layer, "not yet" card, banker CTA.
- Deployed on Vercel with a public URL.
- AI fallback: if an AI call fails or times out (15s), the plan still renders using deterministic engine output and template explanations.

## Nice-to-have (P1)
- Chat panel (`/api/chat`).
- Side-by-side persona comparison view.
- Catalog "last verified" refresh demo (re-fetch 1 to 2 product pages).
- ElevenLabs voice readout of the plan (MLH prize).

## Out of scope
Real bank connections (Plaid is "future plans"), storing real financial data in a database, real credit pulls, any FNB branding or logos, investment advice.

## Key product rules
1. **Never invent products, rates, or fees.** The AI may only reference product IDs from `src/data/catalog.json`. The server rejects any unknown ID. Unpublished rates display as "Check current rate with FNB".
2. **Stage everything.** Foundation first (everyday banking, emergency fund), bigger moves later with explicit unlock conditions. Method inspired by *I Will Teach You to Be Rich* (credited in Devpost; no book text or branding in the app).
3. **Restraint is a feature.** The engine must produce at least one "not yet" item whenever the user lacks a 3-month emergency fund or the goal horizon is longer than the product makes sense for.
4. **Show the math.** Monthly surplus = income minus fixed costs minus debt payments. Allocation never exceeds surplus. Displayed on the page.
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
