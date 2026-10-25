# Contracts v2.3

v2.3 (Sat 11:25 PM, contract-change): Ask Sprout **conversation memory, intents, snapshot context**; **document upload** (`POST /api/extract`). Everything else unchanged from v2.2.

v2.2 (Sat 9:00 PM, contract-change): **Share with FNB** (opt-in storage), **banker dashboard**, banker role. Everything else unchanged from v2.1.

**Frozen after issue #1 merges.** Changes require a separate PR labeled `contract-change` plus an in-person heads-up.
Issue #1 copies the types below verbatim into `src/types/index.ts` and the zod schemas into `src/types/schemas.ts`.

## Shared types

```ts
// ---------- enums ----------
export type GoalId =
  | "first_home"
  | "travel"
  | "emergency_fund"
  | "small_business"
  | "education"
  | "family"
  | "credit_building"
  | "everyday_banking";

export type LifeStage = "student" | "new_grad" | "young_family";
export type CreditBand = "building" | "fair" | "good" | "excellent" | "unsure";
export type ValueTag = "freedom" | "security" | "experiences" | "family" | "growth" | "simplicity";
export type Confidence = "high" | "medium" | "low";
export type Stage = "now" | "next" | "later";   // starter plan -> next move -> unlocks later

// ---------- intake (client -> server) ----------
export interface GoalAnswer {
  id: GoalId;
  priority: 1 | 2 | 3;          // 1 = most important
  horizonMonths: number;        // when they want it, 1..120
  targetAmount?: number;        // USD, optional; engine estimates if missing
  why: string;                  // short free text or chosen card label, may be ""
}

export interface SwipeCard {     // defined in src/data/swipeCards.ts (Ethan), shared shape
  id: string;
  prompt: string;               // e.g. "Next summer you'd rather..."
  left:  { label: string; value: ValueTag };   // e.g. "Backpack through Japan" -> experiences
  right: { label: string; value: ValueTag };   // e.g. "Build a safety cushion" -> security
}

export interface SwipeAnswer {
  cardId: string;
  choice: "left" | "right";
}

export interface IntakeAnswers {
  lifeStage: LifeStage;
  swipes: SwipeAnswer[];        // 6 to 10 cards
  values: ValueTag[];           // derived client-side from swipes: tally, most chosen first, 1..3 items
  goals: GoalAnswer[];          // 1..3 goals
  richLifeText?: string;        // optional "describe your rich life", <= 500 chars
}

export type IncomeKind =
  | "job" | "work_study" | "family" | "aid_refund" | "scholarship"
  | "summer_savings" | "gig" | "other";
export type IncomeFrequency = "monthly" | "per_semester" | "one_time";

export interface IncomeSource {
  kind: IncomeKind;
  amount: number;               // USD after tax, per occurrence
  frequency: IncomeFrequency;
}

export interface FinancialSnapshot {
  hasSteadyIncome: boolean;     // false = no job or irregular money (valid, common for students)
  incomeSources: IncomeSource[];  // may be empty
  // Engine normalizes to effective monthly income (shown to the user):
  //   monthly x 1, per_semester / 4, one_time / 9 (spread over the 9-month academic year)
  monthlyFixedCosts: number;    // rent, utilities, insurance, groceries, phone
  monthlyDebtPayments: number;  // loans, card minimums
  savingsBalance: number;       // liquid savings
  creditBand: CreditBand;
  isFnbCustomer: boolean;
}

// ---------- AI goal profile ----------
export interface ProfiledGoal extends GoalAnswer {
  targetAmount: number;         // filled in (user value or estimate)
  targetIsEstimate: boolean;
  motivation: string;           // 1 sentence, the "why" in plain words
}

export type PersonaId =
  | "freedom_seeker" | "experience_collector" | "safety_builder"
  | "family_first" | "future_builder" | "simple_saver";

// Fixed taxonomy, single source of truth: src/data/personaTaxonomy.ts (owner: Ben).
// Deterministic: persona = PERSONA_BY_VALUE[values[0]] (the top value from swipes).
// Frontend uses it directly for the pre-login reveal; /api/profile returns the SAME id and label.
export interface PersonaDef {
  id: PersonaId;
  label: string;                // "Freedom Seeker"
  tagline: string;              // fixed 1-line default description
}
// PERSONA_BY_VALUE: Record<ValueTag, PersonaDef>
//   freedom -> freedom_seeker "Freedom Seeker"      experiences -> experience_collector "Experience Collector"
//   security -> safety_builder "Safety Builder"     family -> family_first "Family First"
//   growth -> future_builder "Future Builder"       simplicity -> simple_saver "Simple Saver"

export interface Persona {
  id: PersonaId;                // MUST equal PERSONA_BY_VALUE[topValue].id
  label: string;                // MUST equal the taxonomy label; AI never renames it
  description: string;          // 1 sentence, warm, in Sprout's voice; AI personalizes this only (fallback: tagline)
}

export interface GoalProfile {
  persona: Persona;
  richLifeStatement: string;    // 1 to 2 sentences in the user's voice
  goals: ProfiledGoal[];        // sorted by priority
  topValues: ValueTag[];
  notes: string[];              // constraints or tensions the AI noticed, max 3
}

// ---------- catalog ----------
export interface Product {
  id: string;                   // kebab-case, unique, e.g. "student-checking"
  name: string;
  category:
    | "checking" | "savings" | "cd" | "credit_card" | "mortgage"
    | "home_equity" | "auto_loan" | "personal_loan" | "student_loan"
    | "small_business" | "education_tool";
  forWho: string;
  goalTags: GoalId[];
  eligibility: {
    studentOnly?: boolean;
    creditBands?: CreditBand[];  // if set, only these bands qualify
    lifeStages?: LifeStage[];
  };
  minOpeningDeposit: number | null; // null = not published
  keyTerms: string[];           // plain-language bullets, max 5, only published facts
  rateNote: string;             // e.g. "3.75% APY (7-month special, as of Oct 1, 2026)" or "Check current rate with FNB"
  sourceUrls: string[];         // fnb-online.com pages
  verified: string;             // ISO date
}

// ---------- engine + plan ----------
export interface ScoreBreakdown {
  goalFit: number;              // 0..40
  eligibility: number;          // 0..25
  affordability: number;        // 0..20
  priority: number;             // 0..15
}

export interface Match {
  productId: string;            // must exist in catalog
  goalId: GoalId;
  stage: Stage;
  unlockCondition?: string;     // REQUIRED when stage === "later": display text, e.g. "When you start your internship"
  unlockTrigger?: UnlockTrigger;  // REQUIRED when stage === "later": machine-readable
  score: number;                // 0..100 = sum of breakdown
  breakdown: ScoreBreakdown;
  explanation: string;          // AI: why this fits THIS user's goal and why
  termsToKnow: string[];        // from catalog keyTerms, max 3
  confidence: Confidence;
  sourceUrl: string;
}

export type LifeEvent = "first_paycheck" | "internship" | "graduation" | "full_time_job" | "turn_21";

export type UnlockTrigger =
  | { kind: "savings_threshold"; amount: number }
  | { kind: "credit_band"; atLeast: CreditBand }
  | { kind: "life_event"; event: LifeEvent };

export type SpendingBucketId = "fixed_costs" | "emergency_fund" | "goal_savings" | "guilt_free";

export interface SpendingBucket {
  bucket: SpendingBucketId;
  monthlyAmount: number;
  percent: number;              // of effective monthly income, 0..100
  note: string;                 // 1 line, plain words
}

export type GapLever =
  | { kind: "turn_up_dial"; moveFromGuiltFree: number }   // only if guilt-free stays >= 10% of income
  | { kind: "more_time"; newHorizonMonths: number }
  | { kind: "smaller_target"; reachableAmount: number };

export interface Allocation {
  goalId: GoalId;
  monthlyAmount: number;
  monthsToTarget: number;       // ceil(target / monthlyAmount); 0 if monthlyAmount is 0
  requiredMonthly: number;      // ceil(target / horizonMonths)
  onTrack: boolean;
  levers: GapLever[];           // empty when onTrack; turn_up_dial first when present
}

export interface FutureYou {    // investing shown inside our advice boundary (docs/SPROUT.md rule set F)
  earmarkMonthly: number | null;  // ~10% for steady income with fixed share <= 60%, else null
  handoff: string;              // "An FNB advisor can help you ..."
  unlockCondition?: string;     // when earmarkMonthly is null
}

export type StepKind = "save" | "open" | "learn" | "habit" | "budget" | "talk_to_banker" | "wait";

export interface PlanStep {
  order: number;
  stage: Stage;
  kind: StepKind;
  title: string;
  detail: string;
  startMonth: number;           // 0 = now
  productId?: string;
  monthlyAmount?: number;
}

export interface NotYet {
  productId?: string;
  goalId?: GoalId;
  reason: string;               // why the agent is holding back
  revisitWhen: string;          // e.g. "after 3 months of expenses saved"
}

export interface Plan {
  headline: string;             // e.g. "Japan in 9 months, first home in 5 years"
  sproutSays: string;           // Sprout's 2-sentence, optimistic intro to the plan
  stepOne: PlanStep;            // the single clearest first action; MUST be doable this week, usually $0
  effectiveMonthlyIncome: number;
  monthlySurplus: number;       // effective income - fixed - debt (may be <= 0)
  spendingPlan: SpendingBucket[];
  fixedShare: number;           // (fixed + debt) / effective income, 0..1+
  cushionTarget: number;        // starter (students) or full (steady income)
  cushionFillsInMonths: number | null;  // null when already met or no emergency allocation
  futureYou: FutureYou;
  emergencyFundTarget: number;  // 3 x (fixed + debt)
  allocation: Allocation[];
  matches: Match[];             // max 2 per goal, sorted by score
  steps: PlanStep[];            // max 8
  notYet: NotYet[];
  bankerSummary: string;        // plain text a banker reads before the call
  aiUsed: boolean;              // false when fallback templates were used
  disclaimer: string;
}

// ---------- Share with FNB (v2.2) ----------
// Opt-in only. Contact comes from the Auth0 session, never from the request body.
export interface ShareContact {
  name: string;
  email: string;
}

export interface SharedPlan {
  id: string;                   // opaque random id (crypto.randomUUID), never the Auth0 sub
  sharedAt: string;             // ISO 8601
  expiresAt: string;            // ISO 8601, sharedAt + 30 days (storage TTL)
  consentVersion: "v1";         // which consent text the user accepted (docs/CONTRACTS.md)
  contact: ShareContact;
  intake: IntakeAnswers;
  snapshot: FinancialSnapshot;
  profile: GoalProfile;
  plan: Plan;
}

export interface SharedPlanSummary {   // one row in the banker list
  id: string;
  sharedAt: string;
  contactName: string;
  lifeStage: LifeStage;
  persona: Persona;
  topGoalLabel: string;         // P1 goal label, e.g. "Study abroad in Japan"
  stepOneTitle: string;
  monthlySurplus: number;
  isFnbCustomer: boolean;
}

export interface ShareStatus {
  shared: boolean;
  id?: string;
  sharedAt?: string;
  expiresAt?: string;
}

// ---------- Ask Sprout (v2.3) ----------
export interface ChatTurn {     // one message of conversation memory, kept in the browser (AppState.chat)
  role: "user" | "sprout";
  text: string;                 // <= 600 chars
}

export type ChatIntentKind =
  | "why_step_one" | "how_split" | "why_cushion" | "why_product" | "product_fees"
  | "when_unlock" | "goal_gap" | "what_if" | "free";

export interface ChatIntent {   // set by a chip; typed questions send none (= "free")
  kind: ChatIntentKind;
  productId?: string;
  goalId?: GoalId;
  amount?: number;              // what_if: monthly dollars (+ more, - less)
}

// ---------- Document upload (v2.3) ----------
export type DocumentKind = "bank_statement" | "pay_stub" | "credit_card_statement" | "credit_report" | "other";

export interface ExtractedSnapshot {  // what Sprout read from one uploaded file; the user reviews it before use
  documentKind: DocumentKind;
  incomeSources: IncomeSource[];
  monthlyFixedCosts: number | null;
  monthlyDebtPayments: number | null;
  savingsBalance: number | null;
  creditBand: CreditBand | null;      // only from a credit report
  confidence: Confidence;
  notes: string[];                    // <= 4 plain sentences; never account numbers or full names
}

// ---------- API envelope ----------
export type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: string };
```

## Endpoints

### POST /api/profile
- Request: `{ intake: IntakeAnswers }`
- Response data: `GoalProfile`
- AI: extracts motivation, fills missing targetAmount with an estimate (flag `targetIsEstimate`), writes richLifeStatement.
- Fallback (AI error/timeout 15s): copy goals, estimates from `src/lib/server/engine/defaults.ts`, template statement.
- Mock: `src/data/mocks/profile.student.json`, `profile.family.json`

### POST /api/plan
- Request: `{ profile: GoalProfile, snapshot: FinancialSnapshot, intake: IntakeAnswers }`
- Response data: `Plan`
- Steps: (1) engine computes surplus, emergency fund target, allocation, scored matches with stage + unlockCondition, notYet, step skeleton grouped by stage; (2) AI writes `explanation`, step `title/detail`, `headline`, `bankerSummary`; (3) server validates every productId against catalog, drops unknown ones.
- Fallback: engine output + template text, `aiUsed: false`.
- Mock: `src/data/mocks/plan.student.json`, `plan.family.json`

### POST /api/chat (P1; v2.3)
- Request: `{ question: string (<= 500), profile: GoalProfile, plan: Plan, snapshot?: FinancialSnapshot, history?: ChatTurn[] (<= 6, oldest first), intent?: ChatIntent }`
- Response data: `{ answer: string, citedProductIds: string[] }` (unchanged)
- `history` is the conversation memory. It lives in the browser (`AppState.chat`, last 6 turns) and is sent with every question; the server stores nothing. Numbers the user typed in `question`/`history` may be echoed; every other number must come from the plan/snapshot facts (number guard).
- `intent` (from chips) routes to deterministic **explain facts** the engine computes (docs/ASK_SPROUT.md); the AI phrases them; a template answer is the fallback. `what_if` uses the existing engine math.

### POST /api/extract (v2.3, P1): document upload
- Request: `multipart/form-data`, one field `file`: `application/pdf`, `image/png`, `image/jpeg`, or `image/webp`, <= 4 MB. One file per request (UI may send up to 3 in sequence).
- Response data: `ExtractedSnapshot`.
- Auth0 session required (same as other APIs). The file is read in memory, sent to the Anthropic API for this request only, and **never stored or logged** (log route, ok/error, ms, size bucket only). `notes` must never contain account numbers or full names.
- AI: `ANTHROPIC_MODEL` with the file as a document/image block, 25 s timeout. Only values visible in the document; anything not shown is `null`, never estimated. Fallback: `{ ok: false, error: "Couldn't read that file. You can type your numbers instead." }`.
- The UI pre-fills the snapshot form from it with a "From your document" marker on each filled field; the user reviews and edits before building. A later file fills only fields still empty; `incomeSources` merge without duplicates.

### Share with FNB (v2.2, P1)
All require an Auth0 session. Storage: Upstash Redis (`@upstash/redis`, approved by Ben). Server reads `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`, falling back to `KV_REST_API_URL` / `KV_REST_API_TOKEN` (Vercel Marketplace naming). If neither is set, share and banker routes return `{ ok: false, error: "Sharing is unavailable right now" }` and the rest of the app is unaffected.

- `GET /api/share` -> `ShareStatus` for the signed-in user.
- `POST /api/share` -> `ShareStatus`
  - Request: `ShareRequestSchema` = `{ consent: true, intake, snapshot, profile, plan }`. `consent` must be the literal `true`.
  - Server builds `SharedPlan`: `contact` from the Auth0 session (`name`, `email`), new `id` (or the user's existing id on re-share, which overwrites), `consentVersion: "v1"`, `sharedAt` now, `expiresAt` = +30 days.
  - Keys: `share:plan:<id>` -> `SharedPlan` (TTL 30 days); `share:user:<auth0 sub>` -> `<id>` (same TTL); `share:index` sorted set of ids by `sharedAt`.
  - Never log plan contents, snapshot numbers, or contact fields. Log route + ok/error + timing only.
- `DELETE /api/share` -> `ShareStatus { shared: false }`. Deletes all three keys/entries for the user ("Stop sharing").

### Banker dashboard (v2.2, P1)
- `GET /api/banker/plans` -> `SharedPlanSummary[]`, newest first, max 50; skips ids whose plan has expired.
- `GET /api/banker/plans/[id]` -> `SharedPlan`, or `{ ok: false, error: "Not found" }` (404).
- Both require the **banker role** (below): signed out -> 401 "Sign in required"; signed in without the role -> 403 "Banker access only".
- Pages: `/banker` (list) and `/banker/[id]` (detail). Login-gated by `src/proxy.ts` like `/plan`; server-side role check before rendering any data.

### Consent text v1 (shown verbatim before sharing)
> **Share my plan with FNB.** An FNB banker will see your name, email, goals, money snapshot, and Sprout plan so they can prepare for a conversation with you. Sprout keeps it for 30 days. You can stop sharing anytime, which deletes it.
>
> [ ] I agree to share my plan with FNB.

Changing this text means bumping `consentVersion`.

## Auth
- Auth0 session required for `/snapshot`, `/plan`, and all `/api/*` except none (all API routes require session).
- **Banker role (v2.2):** Auth0 RBAC role `banker`, added to the ID token by a post-login Action as the custom claim `https://sprout-demo/roles` (string array). Server helper `requireBanker()` in `src/lib/server/auth.ts` checks that claim. Fallback for demo reliability: env `BANKER_EMAILS` (comma-separated, server-only) also grants the role. Verify in the `@auth0/nextjs-auth0` v4 README whether custom ID token claims reach `session.user` (v4 may filter claims; if so, keep the claim via `beforeSessionSaved`).
- With `DEMO_AUTH_BYPASS=1` the demo session is treated as a banker (emergency demo switch only; shared data in the demo is persona data).
- `/banker` and `/banker/[id]` are login-gated like `/snapshot` and `/plan`.
- Env: see `.env.example`.

## Client state (sessionStorage key `waypoint:v1`)
```ts
interface AppState {
  intake?: IntakeAnswers;
  snapshot?: FinancialSnapshot;
  profile?: GoalProfile;
  plan?: Plan;
  chat?: ChatTurn[];   // v2.3: Ask Sprout memory, last 6 turns
}
```

## Demo personas (`src/data/personas.ts`)

**Maya (hero, college student, no steady job) v3:** lifeStage student; hasSteadyIncome false; incomeSources: summer_savings 3000 one_time, aid_refund 2000 per_semester, family 300 monthly (effective $1,133/month); monthlyFixedCosts 650; monthlyDebtPayments 0; savingsBalance 400; creditBand "building"; isFnbCustomer false. Values [experiences, freedom] -> Experience Collector. Goals: travel (P1, 12 months, $2,500, "study abroad in Japan"), credit_building (P2, 12 months), first_home (P3, 84 months, "own a place after graduation"). Expected engine output: see the golden test in docs/SPROUT.md.

**Jordan (contrast, young family):** lifeStage young_family; hasSteadyIncome true; incomeSources: job 2400 monthly; monthlyFixedCosts 1500; monthlyDebtPayments 150; savingsBalance 1200; creditBand "fair"; isFnbCustomer false. Swipes lean security + family. Goals: first_home (P1, 60 months, $15,000), emergency_fund (P2, 12 months).

**Banker demo:** sign in as a banker account, share Maya's plan from `/plan`, open `/banker`.

**Live proof moment:** re-run Maya with opposite swipes; the persona, plan, and roadmap visibly change while her finances stay identical.
