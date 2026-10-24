# Contracts v1

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

// ---------- intake (client -> server) ----------
export interface GoalAnswer {
  id: GoalId;
  priority: 1 | 2 | 3;          // 1 = most important
  horizonMonths: number;        // when they want it, 1..120
  targetAmount?: number;        // USD, optional; engine estimates if missing
  why: string;                  // short free text or chosen card label, may be ""
}

export interface IntakeAnswers {
  lifeStage: LifeStage;
  values: ValueTag[];           // ordered, most important first, 1..3 items
  goals: GoalAnswer[];          // 1..3 goals
  richLifeText?: string;        // optional "describe your rich life", <= 500 chars
}

export interface FinancialSnapshot {
  monthlyIncome: number;        // USD after tax
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

export interface GoalProfile {
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
  score: number;                // 0..100 = sum of breakdown
  breakdown: ScoreBreakdown;
  explanation: string;          // AI: why this fits THIS user's goal and why
  termsToKnow: string[];        // from catalog keyTerms, max 3
  confidence: Confidence;
  sourceUrl: string;
}

export interface Allocation {
  goalId: GoalId;
  monthlyAmount: number;
  monthsToTarget: number;       // ceil((target - allocated savings) / monthlyAmount)
}

export type StepKind = "save" | "open" | "learn" | "talk_to_banker" | "wait";

export interface PlanStep {
  order: number;
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
  monthlySurplus: number;       // income - fixed - debt
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
- Steps: (1) engine computes surplus, emergency fund target, allocation, scored matches, notYet, step skeleton; (2) AI writes `explanation`, step `title/detail`, `headline`, `bankerSummary`; (3) server validates every productId against catalog, drops unknown ones.
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
Both personas share the SAME snapshot so goals alone change the plan:
- monthlyIncome 2400, monthlyFixedCosts 1500, monthlyDebtPayments 150, savingsBalance 1200, creditBand "building", isFnbCustomer false.
- **Maya (student):** lifeStage student, values [experiences, freedom], goals: travel (P1, 9 months, $3,000, "study abroad in Japan"), credit_building (P2, 12 months).
- **Jordan (young family):** lifeStage young_family, values [security, family], goals: first_home (P1, 60 months, $15,000 down + closing), emergency_fund (P2, 12 months).
