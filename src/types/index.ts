// Copied verbatim from docs/CONTRACTS.md (Contracts v2.1). Change only via a contract-change PR.

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

// ---------- API envelope ----------
export type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: string };
