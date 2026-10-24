// Copied verbatim from docs/CONTRACTS.md (Contracts v1). Change only via a contract-change PR.

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
  stage: Stage;
  unlockCondition?: string;     // REQUIRED when stage === "later", e.g. "3 months of expenses saved"
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
