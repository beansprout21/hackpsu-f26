// Zod schemas for the shapes in docs/CONTRACTS.md (Contracts v2).
// Each schema is type-checked against its interface in ./index.ts at the
// bottom of this file, so drift between the two fails `npm run build`.
import { z } from "zod";
import type {
  Allocation,
  FinancialSnapshot,
  GoalAnswer,
  GoalProfile,
  IncomeSource,
  IntakeAnswers,
  Match,
  NotYet,
  Plan,
  PlanStep,
  Persona,
  PersonaDef,
  Product,
  ProfiledGoal,
  ScoreBreakdown,
  SpendingBucket,
  SwipeAnswer,
  SwipeCard,
  UnlockTrigger,
} from "./index";

// ---------- enums ----------
export const GoalIdSchema = z.enum([
  "first_home",
  "travel",
  "emergency_fund",
  "small_business",
  "education",
  "family",
  "credit_building",
  "everyday_banking",
]);
export const LifeStageSchema = z.enum(["student", "new_grad", "young_family"]);
export const CreditBandSchema = z.enum(["building", "fair", "good", "excellent", "unsure"]);
export const ValueTagSchema = z.enum([
  "freedom",
  "security",
  "experiences",
  "family",
  "growth",
  "simplicity",
]);
export const ConfidenceSchema = z.enum(["high", "medium", "low"]);
export const StageSchema = z.enum(["now", "next", "later"]);
export const StepKindSchema = z.enum(["save", "open", "learn", "habit", "budget", "talk_to_banker", "wait"]);
export const IncomeKindSchema = z.enum([
  "job",
  "work_study",
  "family",
  "aid_refund",
  "scholarship",
  "summer_savings",
  "gig",
  "other",
]);
export const IncomeFrequencySchema = z.enum(["monthly", "per_semester", "one_time"]);
export const LifeEventSchema = z.enum(["first_paycheck", "internship", "graduation", "full_time_job", "turn_21"]);
export const SpendingBucketIdSchema = z.enum(["fixed_costs", "emergency_fund", "goal_savings", "guilt_free"]);

const usd = z.number().finite().nonnegative();

// ---------- intake ----------
export const GoalAnswerSchema = z.object({
  id: GoalIdSchema,
  priority: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  horizonMonths: z.number().int().min(1).max(120),
  targetAmount: usd.optional(),
  why: z.string(),
});

export const SwipeCardSchema = z.object({
  id: z.string(),
  prompt: z.string(),
  left: z.object({ label: z.string(), value: ValueTagSchema }),
  right: z.object({ label: z.string(), value: ValueTagSchema }),
});

export const SwipeAnswerSchema = z.object({
  cardId: z.string(),
  choice: z.enum(["left", "right"]),
});

export const IntakeAnswersSchema = z.object({
  lifeStage: LifeStageSchema,
  swipes: z.array(SwipeAnswerSchema).min(6).max(10),
  values: z.array(ValueTagSchema).min(1).max(3),
  goals: z.array(GoalAnswerSchema).min(1).max(3),
  richLifeText: z.string().max(500).optional(),
});

export const IncomeSourceSchema = z.object({
  kind: IncomeKindSchema,
  amount: usd,
  frequency: IncomeFrequencySchema,
});

export const FinancialSnapshotSchema = z.object({
  hasSteadyIncome: z.boolean(),
  incomeSources: z.array(IncomeSourceSchema),
  monthlyFixedCosts: usd,
  monthlyDebtPayments: usd,
  savingsBalance: usd,
  creditBand: CreditBandSchema,
  isFnbCustomer: z.boolean(),
});

// ---------- AI goal profile ----------
export const ProfiledGoalSchema = GoalAnswerSchema.extend({
  targetAmount: usd,
  targetIsEstimate: z.boolean(),
  motivation: z.string(),
});

export const PersonaIdSchema = z.enum([
  "freedom_seeker",
  "experience_collector",
  "safety_builder",
  "family_first",
  "future_builder",
  "simple_saver",
]);

export const PersonaDefSchema = z.object({
  id: PersonaIdSchema,
  label: z.string(),
  tagline: z.string(),
});

export const PersonaSchema = z.object({
  id: PersonaIdSchema,
  label: z.string(),
  description: z.string(),
});

export const GoalProfileSchema = z.object({
  persona: PersonaSchema,
  richLifeStatement: z.string(),
  goals: z.array(ProfiledGoalSchema),
  topValues: z.array(ValueTagSchema),
  notes: z.array(z.string()).max(3),
});

// ---------- catalog ----------
export const ProductSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "id must be kebab-case"),
  name: z.string(),
  category: z.enum([
    "checking",
    "savings",
    "cd",
    "credit_card",
    "mortgage",
    "home_equity",
    "auto_loan",
    "personal_loan",
    "student_loan",
    "small_business",
    "education_tool",
  ]),
  forWho: z.string(),
  goalTags: z.array(GoalIdSchema),
  eligibility: z.object({
    studentOnly: z.boolean().optional(),
    creditBands: z.array(CreditBandSchema).optional(),
    lifeStages: z.array(LifeStageSchema).optional(),
  }),
  minOpeningDeposit: usd.nullable(),
  keyTerms: z.array(z.string()).max(5),
  rateNote: z.string(),
  sourceUrls: z.array(z.string()),
  verified: z.iso.date(),
});

// ---------- engine + plan ----------
export const ScoreBreakdownSchema = z.object({
  goalFit: z.number().min(0).max(40),
  eligibility: z.number().min(0).max(25),
  affordability: z.number().min(0).max(20),
  priority: z.number().min(0).max(15),
});

export const UnlockTriggerSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("savings_threshold"), amount: usd }),
  z.object({ kind: z.literal("credit_band"), atLeast: CreditBandSchema }),
  z.object({ kind: z.literal("life_event"), event: LifeEventSchema }),
]);

export const MatchSchema = z
  .object({
    productId: z.string(),
    goalId: GoalIdSchema,
    stage: StageSchema,
    unlockCondition: z.string().optional(),
    unlockTrigger: UnlockTriggerSchema.optional(),
    score: z.number().min(0).max(100),
    breakdown: ScoreBreakdownSchema,
    explanation: z.string(),
    termsToKnow: z.array(z.string()).max(3),
    confidence: ConfidenceSchema,
    sourceUrl: z.string(),
  })
  .superRefine((m, ctx) => {
    if (m.stage === "later" && !m.unlockCondition?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["unlockCondition"],
        message: 'unlockCondition is required when stage is "later"',
      });
    }
    if (m.stage === "later" && !m.unlockTrigger) {
      ctx.addIssue({
        code: "custom",
        path: ["unlockTrigger"],
        message: 'unlockTrigger is required when stage is "later"',
      });
    }
    const { goalFit, eligibility, affordability, priority } = m.breakdown;
    if (Math.abs(goalFit + eligibility + affordability + priority - m.score) > 0.001) {
      ctx.addIssue({ code: "custom", path: ["score"], message: "score must equal the sum of breakdown" });
    }
  });

export const SpendingBucketSchema = z.object({
  bucket: SpendingBucketIdSchema,
  monthlyAmount: usd,
  percent: z.number().min(0).max(100),
  note: z.string(),
});

export const AllocationSchema = z.object({
  goalId: GoalIdSchema,
  monthlyAmount: usd,
  monthsToTarget: z.number().int().nonnegative(),
});

export const PlanStepSchema = z.object({
  order: z.number().int(),
  stage: StageSchema,
  kind: StepKindSchema,
  title: z.string(),
  detail: z.string(),
  startMonth: z.number().int().nonnegative(),
  productId: z.string().optional(),
  monthlyAmount: usd.optional(),
});

export const NotYetSchema = z.object({
  productId: z.string().optional(),
  goalId: GoalIdSchema.optional(),
  reason: z.string(),
  revisitWhen: z.string(),
});

export const PlanSchema = z
  .object({
    headline: z.string(),
    sproutSays: z.string(),
    stepOne: PlanStepSchema,
    effectiveMonthlyIncome: usd,
    monthlySurplus: z.number().finite(), // can be negative
    spendingPlan: z.array(SpendingBucketSchema),
    emergencyFundTarget: usd,
    allocation: z.array(AllocationSchema),
    matches: z.array(MatchSchema),
    steps: z.array(PlanStepSchema).max(8),
    notYet: z.array(NotYetSchema),
    bankerSummary: z.string(),
    aiUsed: z.boolean(),
    disclaimer: z.string(),
  })
  .superRefine((p, ctx) => {
    const perGoal = new Map<string, number>();
    for (const m of p.matches) perGoal.set(m.goalId, (perGoal.get(m.goalId) ?? 0) + 1);
    for (const [goalId, count] of perGoal) {
      if (count > 2) {
        ctx.addIssue({ code: "custom", path: ["matches"], message: `max 2 matches per goal (${goalId} has ${count})` });
      }
    }
    const buckets = p.spendingPlan.map((b) => b.bucket);
    if (new Set(buckets).size !== buckets.length) {
      ctx.addIssue({ code: "custom", path: ["spendingPlan"], message: "each spending bucket may appear once" });
    }
    const allocated = p.allocation.reduce((sum, a) => sum + a.monthlyAmount, 0);
    if (allocated > Math.max(p.monthlySurplus, 0) + 0.001) {
      ctx.addIssue({ code: "custom", path: ["allocation"], message: "allocation exceeds monthly surplus" });
    }
  });

// ---------- endpoint bodies ----------
export const ProfileRequestSchema = z.object({ intake: IntakeAnswersSchema });
export const PlanRequestSchema = z.object({
  profile: GoalProfileSchema,
  snapshot: FinancialSnapshotSchema,
  intake: IntakeAnswersSchema,
});
export const ChatRequestSchema = z.object({
  question: z.string().min(1),
  profile: GoalProfileSchema,
  plan: PlanSchema,
});
export const ChatResponseSchema = z.object({
  answer: z.string(),
  citedProductIds: z.array(z.string()),
});

// ---------- compile-time drift checks ----------
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type Assert<T extends true> = T;

export type SchemaChecks = [
  Assert<Same<z.infer<typeof GoalAnswerSchema>, GoalAnswer>>,
  Assert<Same<z.infer<typeof SwipeCardSchema>, SwipeCard>>,
  Assert<Same<z.infer<typeof SwipeAnswerSchema>, SwipeAnswer>>,
  Assert<Same<z.infer<typeof IncomeSourceSchema>, IncomeSource>>,
  Assert<Same<z.infer<typeof PersonaSchema>, Persona>>,
  Assert<Same<z.infer<typeof PersonaDefSchema>, PersonaDef>>,
  Assert<Same<z.infer<typeof UnlockTriggerSchema>, UnlockTrigger>>,
  Assert<Same<z.infer<typeof SpendingBucketSchema>, SpendingBucket>>,
  Assert<Same<z.infer<typeof IntakeAnswersSchema>, IntakeAnswers>>,
  Assert<Same<z.infer<typeof FinancialSnapshotSchema>, FinancialSnapshot>>,
  Assert<Same<z.infer<typeof ProfiledGoalSchema>, ProfiledGoal>>,
  Assert<Same<z.infer<typeof GoalProfileSchema>, GoalProfile>>,
  Assert<Same<z.infer<typeof ProductSchema>, Product>>,
  Assert<Same<z.infer<typeof ScoreBreakdownSchema>, ScoreBreakdown>>,
  Assert<Same<z.infer<typeof MatchSchema>, Match>>,
  Assert<Same<z.infer<typeof AllocationSchema>, Allocation>>,
  Assert<Same<z.infer<typeof PlanStepSchema>, PlanStep>>,
  Assert<Same<z.infer<typeof NotYetSchema>, NotYet>>,
  Assert<Same<z.infer<typeof PlanSchema>, Plan>>,
];
