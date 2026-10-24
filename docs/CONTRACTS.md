# Contracts v2

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

export interface Allocation {
  goalId: GoalId;
  monthlyAmount: number;
  monthsToTarget: number;       // ceil((target - allocated savings) / monthlyAmount)
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
  emergencyFundTarget: number;  // 3 x (fixed + debt)
  allocation: Allocation[];
  matches: Match[];             // max 2 per goal, sorted by score
  steps: PlanStep[];            // max 8
  notYet: NotYet[];
  bankerSummary: string;        // plain text a banker reads before the call
  aiUsed: boolean;              // false when fallback templates were used
  disclaimer: string;
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

### POST /api/chat (P1)
- Request: `{ question: string, profile: GoalProfile, plan: Plan }`
- Response data: `{ answer: string, citedProductIds: string[] }`

## Auth
- Auth0 session required for `/snapshot`, `/plan`, and all `/api/*` except none (all API routes require session).
- Env: see `.env.example`.

## Client state (sessionStorage key `waypoint:v1`)
```ts
interface AppState {
  intake?: IntakeAnswers;
  snapshot?: FinancialSnapshot;
  profile?: GoalProfile;
  plan?: Plan;
}
```

## Demo personas (`src/data/personas.ts`)

**Maya (hero, college student, no steady job):** lifeStage student; hasSteadyIncome false; incomeSources: summer_savings 2400 one_time, aid_refund 1500 per_semester, family 200 monthly (effective ~$842/month); monthlyFixedCosts 650; monthlyDebtPayments 0; savingsBalance 800; creditBand "building"; isFnbCustomer false. Swipes lean experiences + freedom. Goals: travel (P1, 9 months, $3,000, "study abroad in Japan"), credit_building (P2, 12 months), first_home (P3, 84 months, "own a place after graduation").

**Jordan (contrast, young family):** lifeStage young_family; hasSteadyIncome true; incomeSources: job 2400 monthly; monthlyFixedCosts 1500; monthlyDebtPayments 150; savingsBalance 1200; creditBand "fair"; isFnbCustomer false. Swipes lean security + family. Goals: first_home (P1, 60 months, $15,000), emergency_fund (P2, 12 months).

**Live proof moment:** re-run Maya with opposite swipes; the persona, plan, and roadmap visibly change while her finances stay identical.
