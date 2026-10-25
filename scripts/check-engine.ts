// Runs the engine on the demo personas plus Step one fixtures, validates every plan, and checks
// the Maya golden test from docs/SPROUT.md v3 row by row. Run: npx tsx scripts/check-engine.ts
import studentProfile from "../src/data/mocks/profile.student.json";
import familyProfile from "../src/data/mocks/profile.family.json";
import { flipSwipes, jordan, maya, mayaOpposite, OPPOSITE_VALUES } from "../src/data/personas";
import { deriveValues } from "../src/components/intake/draft";
import { personaFromValues } from "../src/data/personaTaxonomy";
import { fallbackProfile } from "../src/lib/ai/profile";
import { wordCount, sentencesOf, TEXT_BUDGET } from "../src/lib/ai/plan";
import { buildPlanSkeleton } from "../src/lib/server/engine/plan";
import { monthsToTarget } from "../src/lib/server/engine/math";
import { getProduct, isCatalogId } from "../src/lib/server/catalog";
import { GoalProfileSchema, PlanSchema } from "../src/types/schemas";
import type { FinancialSnapshot, GoalAnswer, GoalProfile, IntakeAnswers, Plan } from "../src/types";

let failures = 0;
const check = (ok: boolean, msg: string) => {
  if (!ok) failures++;
  console.log(`${ok ? "  ok  " : "  FAIL"} ${msg}`);
};

const mayaProfile = GoalProfileSchema.parse(studentProfile);
const jordanProfile = GoalProfileSchema.parse(familyProfile);

// Opposite swipes: same finances and goals, flipped values -> different persona and plan.
const oppositeIntake: IntakeAnswers = mayaOpposite.intake;
const oppositeDef = personaFromValues(OPPOSITE_VALUES);
const oppositeProfile: GoalProfile = {
  ...mayaProfile,
  persona: { id: oppositeDef.id, label: oppositeDef.label, description: oppositeDef.tagline },
  topValues: OPPOSITE_VALUES,
};

// Step one fixtures (SPROUT.md v3 rule D rows 1 to 5, the $10 variant, no goals) and cushion edge cases,
// all derived from Maya so the rest of her numbers stay familiar.
const withSnapshot = (patch: Partial<FinancialSnapshot>): FinancialSnapshot => ({ ...maya.snapshot, ...patch });
const withGoals = (goals: GoalAnswer[]): IntakeAnswers => ({ ...maya.intake, goals });
const fixture = (name: string, intake: IntakeAnswers, snapshot: FinancialSnapshot, profile = fallbackProfile(intake)) => ({
  name,
  plan: buildPlanSkeleton(profile, snapshot, intake),
});
const noGoalsIntake = withGoals([]);
const noGoalsProfile: GoalProfile = { ...fallbackProfile(maya.intake), goals: [] };

const fixtures = {
  row1: fixture("Row 1: surplus <= 0 (fixed $1,200)", maya.intake, withSnapshot({ monthlyFixedCosts: 1200 })),
  row2: fixture(
    "Row 2: P1 credit building",
    withGoals([
      { id: "credit_building", priority: 1, horizonMonths: 12, why: "" },
      { id: "travel", priority: 2, horizonMonths: 12, targetAmount: 2500, why: "study abroad in Japan" },
    ]),
    maya.snapshot,
  ),
  row3: fixture("Row 3: P1 everyday banking", withGoals([{ id: "everyday_banking", priority: 1, horizonMonths: 6, why: "" }]), maya.snapshot),
  row4: fixture("Row 4: P1 emergency fund", withGoals([{ id: "emergency_fund", priority: 1, horizonMonths: 12, why: "" }]), maya.snapshot),
  noGoals: fixture("Row 4: no goals", noGoalsIntake, maya.snapshot, noGoalsProfile),
  tenDollar: fixture("Row 5 with $10 (surplus $83)", maya.intake, withSnapshot({ monthlyFixedCosts: 1050 })),
  lowCost: fixture("Low-cost student (fixed $150)", maya.intake, withSnapshot({ monthlyFixedCosts: 150 })),
  cushionMet: fixture("Cushion met (savings $2,500)", maya.intake, withSnapshot({ savingsBalance: 2500 })),
};

const runs: { name: string; plan: Plan }[] = [
  { name: "Maya", plan: buildPlanSkeleton(mayaProfile, maya.snapshot, maya.intake) },
  { name: "Maya (opposite swipes)", plan: buildPlanSkeleton(oppositeProfile, maya.snapshot, oppositeIntake) },
  { name: "Jordan", plan: buildPlanSkeleton(jordanProfile, jordan.snapshot, jordan.intake) },
  ...Object.values(fixtures),
];

const BANNED = /\b(only|just|behind|should have|can't afford|waste)\b/i;
const BARE_CUSHION = /(?<!safety )(?<!safety-)\bcushion\b/i; // v3: the user-facing name is always "safety cushion"
const ACCOUNT = ["checking", "savings", "cd", "credit_card", "small_business"];
const templateText = (p: Plan) => [
  p.headline,
  p.sproutSays,
  p.stepOne.title,
  p.stepOne.detail,
  p.bankerSummary,
  p.futureYou.handoff,
  p.futureYou.unlockCondition ?? "",
  ...p.spendingPlan.map((b) => b.note),
  // termsToKnow are FNB catalog facts (e.g. "interest-only"), not Sprout's voice, so they're not scanned.
  ...p.matches.flatMap((m) => [m.explanation, m.unlockCondition ?? ""]),
  ...p.steps.flatMap((s) => [s.title, s.detail]),
  ...p.notYet.flatMap((n) => [n.reason, n.revisitWhen]),
];

for (const { name, plan } of runs) {
  console.log(`\n=== ${name}: ${plan.headline}`);
  console.log(`  income ${plan.effectiveMonthlyIncome}, fixedShare ${plan.fixedShare}, surplus ${plan.monthlySurplus}, cushion ${plan.cushionTarget} (fills in ${plan.cushionFillsInMonths})`);
  console.log(`  buckets ${plan.spendingPlan.map((b) => `${b.bucket}=${b.monthlyAmount} (${b.percent}%)`).join(", ")}`);
  for (const a of plan.allocation) {
    console.log(`  alloc ${a.goalId}: ${a.monthlyAmount}/mo, needs ${a.requiredMonthly}, onTrack ${a.onTrack}, levers ${JSON.stringify(a.levers)}`);
  }
  console.log(`  futureYou ${JSON.stringify(plan.futureYou)}`);
  console.log(`  sproutSays: ${plan.sproutSays}`);
  console.log(`  stepOne: [${plan.stepOne.kind}] ${plan.stepOne.title} / ${plan.stepOne.detail}`);
  for (const m of plan.matches) {
    const unlock = m.unlockTrigger ? ` | ${JSON.stringify(m.unlockTrigger)} "${m.unlockCondition}"` : "";
    console.log(`  ${m.stage.padEnd(5)} ${String(m.score).padStart(3)} ${m.goalId.padEnd(16)} ${m.productId} [${m.termsToKnow[0]}]${unlock}`);
  }
  for (const s of plan.steps) console.log(`  step ${s.order} [${s.stage}/${s.kind}] m${s.startMonth} ${s.title}`);
  for (const n of plan.notYet) console.log(`  notYet: ${n.reason} (revisit ${n.revisitWhen})`);

  const parsed = PlanSchema.safeParse(plan);
  check(parsed.success, `plan validates${parsed.success ? "" : `: ${JSON.stringify(parsed.error.issues)}`}`);
  check(plan.matches.every((m) => isCatalogId(m.productId)), "all match ids are catalog ids");
  check(plan.matches.some((m) => m.stage === "now"), "has at least one now match");
  check(
    plan.stepOne.stage === "now" && plan.stepOne.startMonth === 0 && !plan.stepOne.productId && plan.stepOne.monthlyAmount === undefined,
    "stepOne is now / month 0, no product, no monthlyAmount (v3)",
  );
  check(plan.steps[0]?.title === plan.stepOne.title && plan.steps[0]?.detail === plan.stepOne.detail, "step 1 is Step one");
  check(plan.steps.some((s) => s.kind === "habit" && /automate/i.test(s.title)), "automate habit step present");
  check(plan.cushionTarget === plan.emergencyFundTarget && plan.cushionTarget >= 1000, "cushionTarget = emergencyFundTarget >= $1,000");
  const banned = templateText(plan).filter((t) => BANNED.test(t));
  check(banned.length === 0, `no banned voice words${banned.length ? `: ${JSON.stringify(banned)}` : ""}`);
  const bare = templateText(plan).filter((t) => BARE_CUSHION.test(t));
  check(bare.length === 0, `cushion is always "safety cushion"${bare.length ? `: ${JSON.stringify(bare)}` : ""}`);
  check(wordCount(plan.headline) <= TEXT_BUDGET.headlineWords, `headline <= ${TEXT_BUDGET.headlineWords} words (${wordCount(plan.headline)})`);
  check(
    sentencesOf(plan.sproutSays).length <= TEXT_BUDGET.sproutSaysSentences && wordCount(plan.sproutSays) <= TEXT_BUDGET.sproutSaysWords,
    `sproutSays <= ${TEXT_BUDGET.sproutSaysSentences} sentences / ${TEXT_BUDGET.sproutSaysWords} words (${sentencesOf(plan.sproutSays).length} / ${wordCount(plan.sproutSays)})`,
  );
  const longFirst = plan.matches.filter((m) => wordCount(sentencesOf(m.explanation)[0] ?? "") > TEXT_BUDGET.explanationFirstSentenceWords);
  check(longFirst.length === 0, `explanation first sentences <= ${TEXT_BUDGET.explanationFirstSentenceWords} words${longFirst.length ? `: ${longFirst.map((m) => m.productId).join(", ")}` : ""}`);
  const accounts = plan.matches.filter((m) => ACCOUNT.includes(getProduct(m.productId)?.category ?? ""));
  check(accounts.every((m) => /fee|penalt/i.test(m.termsToKnow[0] ?? "")), "every account card leads with its fee line");
  const bucketTotal = plan.spendingPlan.reduce((s, b) => s + b.monthlyAmount, 0) + (plan.futureYou.earmarkMonthly ?? 0);
  check(bucketTotal <= plan.effectiveMonthlyIncome + 0.001 || plan.monthlySurplus <= 0, "buckets + Future You never exceed income");
}

const [m, opp, j] = runs.map((r) => r.plan);
const bucket = (p: Plan, id: string) => p.spendingPlan.find((b) => b.bucket === id);
const alloc = (p: Plan, id: string) => p.allocation.find((a) => a.goalId === id);
const stageOf = (p: Plan, id: string) => p.matches.find((x) => x.productId === id)?.stage;
const japan = alloc(m, "travel");

console.log("\n=== Maya golden test (docs/SPROUT.md v3)");
check(Math.floor(m.effectiveMonthlyIncome) === 1133, `Effective income $1,133 (got ${m.effectiveMonthlyIncome})`);
check(Math.round(m.fixedShare * 100) === 57 && !m.steps.some((s) => /Big Win/.test(s.title)), "Fixed share 57%, normal case");
check(
  bucket(m, "emergency_fund")?.monthlyAmount === 113 && bucket(m, "goal_savings")?.monthlyAmount === 113,
  "Savings $226 -> cushion $113, goals $113",
);
check(
  [alloc(m, "travel")?.monthlyAmount, alloc(m, "credit_building")?.monthlyAmount, alloc(m, "first_home")?.monthlyAmount].join() === "69,28,16",
  "Goals -> Japan $69, credit $28, home $16",
);
check(bucket(m, "guilt_free")?.monthlyAmount === 257 && Math.round(bucket(m, "guilt_free")?.percent ?? 0) === 23, "Guilt-free $257 (23%)");
check(japan?.requiredMonthly === 209 && japan.onTrack === false, "Japan needs $209/mo, has $69 -> off track");
check(
  JSON.stringify(japan?.levers) ===
    JSON.stringify([
      { kind: "turn_up_dial", moveFromGuiltFree: 140 },
      { kind: "more_time", newHorizonMonths: 37 },
      { kind: "smaller_target", reachableAmount: 828 },
    ]),
  "Levers: turn_up_dial $140 first, more_time 37 months, smaller_target $828",
);
check((257 - 140) / m.effectiveMonthlyIncome >= 0.1, "turn_up_dial keeps guilt-free at $117 (>= 10% of income)");
check(
  m.cushionTarget === 1950 && m.emergencyFundTarget === 1950 && m.cushionFillsInMonths === 14,
  `Safety cushion: target $1,950 (3 x $650), $400 counted, $113/mo, full in 14 months (got ${m.cushionTarget}, ${m.cushionFillsInMonths})`,
);
check(monthsToTarget(650, 400, 113) === 3 && /in 3 months/.test(m.sproutSays), 'Milestone "1 month covered" ($650) in 3 months, named in sproutSays');
check(
  m.stepOne.kind === "save" &&
    m.stepOne.title === "Move $20 into your travel fund right now." &&
    m.stepOne.detail === "You'll put $69 a month toward it. This starts it.",
  `Step one (rule D5): "${m.stepOne.title}" / "${m.stepOne.detail}"`,
);
check(m.matches.find((x) => x.stage === "now")?.productId === "student-checking", "FNB fit: Student Checking is the top now match");
check(/No monthly fee on Student Checking/.test(m.matches.find((x) => x.productId === "student-checking")?.termsToKnow[0] ?? ""), "FNB fit: fee line first");
const scholarshipInCatalog = isCatalogId("fnb-student-scholarship");
check(
  stageOf(m, "student-checking") === "now" &&
    stageOf(m, "learning-center") === "now" &&
    (!scholarshipInCatalog || stageOf(m, "fnb-student-scholarship") === "now"),
  `Now includes Student Checking + Learning Center${scholarshipInCatalog ? " + FNB scholarship entry" : ""}`,
);
check(m.matches.some((x) => x.productId === "savers-goal-cd" && x.stage === "next" && x.goalId === "travel"), "Next: Savers Goal CD for the Japan fund");
check(
  m.matches.some(
    (x) =>
      x.productId === "smartsecured-card" &&
      x.stage === "later" &&
      x.unlockTrigger?.kind === "savings_threshold" &&
      x.unlockTrigger.amount === 1150 &&
      /first paycheck/.test(x.unlockCondition ?? ""),
  ),
  "Later: SmartSecured (savings >= $1,150 = 1 month of costs + $500 deposit, or first paycheck)",
);
check(
  m.matches.some(
    (x) =>
      ["fnb-home-ownership-program", "homeone-mortgage", "fha-mortgage", "home-possible-mortgage"].includes(x.productId) &&
      x.stage === "later" &&
      x.unlockTrigger?.kind === "savings_threshold" &&
      x.unlockTrigger.amount === 1950 &&
      /full-time job/.test(x.unlockCondition ?? "") &&
      /safety cushion/.test(x.unlockCondition ?? ""),
  ),
  "Later: homebuyer program (full-time job + $1,950 safety cushion)",
);
check(m.futureYou.earmarkMonthly === null && /first full-time paycheck/.test(m.futureYou.unlockCondition ?? ""), "Future You: handoff only, unlocks with first full-time paycheck");
check(m.notYet.some((n) => n.revisitWhen === "after a steady income and 3 months saved"), "Not yet: mortgage pre-approval after steady income and 3 months saved");
check(/\$140 a month away/.test(m.sproutSays), "sproutSays leads with the top-value goal's dial lever");

console.log("\n=== Step one fixtures (rule D rows) + cushion edge cases");
const f = fixtures;
check(f.row1.plan.monthlySurplus <= 0 && f.row1.plan.stepOne.kind === "budget" && f.row1.plan.stepOne.title === "Open your bank app and find last week's 3 biggest buys." && f.row1.plan.stepOne.detail === "That's where we'll find your breathing room.", `Row 1: "${f.row1.plan.stepOne.title}"`);
check(f.row2.plan.stepOne.kind === "learn" && f.row2.plan.stepOne.title === "Check your free credit report now." && /annualcreditreport\.com/.test(f.row2.plan.stepOne.detail), `Row 2: "${f.row2.plan.stepOne.title}"`);
check(f.row3.plan.stepOne.kind === "habit" && f.row3.plan.stepOne.title === "Turn on low-balance alerts in your bank app." && f.row3.plan.stepOne.detail === "No surprise fees, ever.", `Row 3: "${f.row3.plan.stepOne.title}"`);
check(f.row4.plan.stepOne.kind === "save" && f.row4.plan.stepOne.title === "Move $20 into savings right now." && f.row4.plan.stepOne.detail === "That starts your $1,950 safety cushion.", `Row 4: "${f.row4.plan.stepOne.title}" / "${f.row4.plan.stepOne.detail}"`);
check(f.noGoals.plan.stepOne.title === "Move $20 into savings right now." && f.noGoals.plan.stepOne.detail === "That starts your $1,950 safety cushion.", `Row 4 (no goals): "${f.noGoals.plan.stepOne.title}"`);
check(f.tenDollar.plan.monthlySurplus > 0 && f.tenDollar.plan.monthlySurplus < 100 && f.tenDollar.plan.stepOne.title === "Move $10 into your travel fund right now.", `Row 5, $10 when surplus < $100: "${f.tenDollar.plan.stepOne.title}" (surplus ${f.tenDollar.plan.monthlySurplus})`);
check(f.lowCost.plan.cushionTarget === 1000 && f.lowCost.plan.emergencyFundTarget === 1000, `Low-cost student: cushion floor $1,000 (got ${f.lowCost.plan.cushionTarget})`);
check(
  f.cushionMet.plan.cushionFillsInMonths === null && bucket(f.cushionMet.plan, "emergency_fund")?.monthlyAmount === 0 && /safety cushion is full/.test(bucket(f.cushionMet.plan, "emergency_fund")?.note ?? ""),
  "Cushion met: no emergency allocation, note says the safety cushion is full",
);
check(j.stepOne.title === "Move $20 into your home fund right now." && j.stepOne.detail === "You'll put $188 a month toward it. This starts it.", `Jordan Step one (row 5): "${j.stepOne.title}" / "${j.stepOne.detail}"`);

console.log("\n=== Jordan + cross-plan checks");
check(j.fixedShare > 0.6 && j.steps.some((s) => /Big Win/.test(s.title)), "Jordan: high-fixed branch with Big Win step");
check(bucket(j, "emergency_fund")!.monthlyAmount + bucket(j, "goal_savings")!.monthlyAmount === 375 && bucket(j, "guilt_free")?.monthlyAmount === 375, "Jordan: savings 50% / guilt-free 50% of $750 surplus");
check(j.cushionTarget === 4950 && j.cushionFillsInMonths === 21, "Jordan: safety cushion $4,950 (3 x $1,650), full in 21 months");
check(j.futureYou.earmarkMonthly === null && /60%/.test(j.futureYou.unlockCondition ?? ""), "Jordan: Future You handoff until fixed costs < 60%");
check(j.matches.filter((x) => x.stage === "later").every((x) => x.unlockTrigger?.kind !== "life_event"), "Jordan: later items use savings/credit triggers");
check(j.notYet.some((n) => n.goalId === "first_home" && n.revisitWhen === "after your $4,950 safety cushion is full"), "Jordan: not-yet for first home until the safety cushion is full");
check(
  JSON.stringify(OPPOSITE_VALUES) === JSON.stringify(deriveValues(flipSwipes(maya.intake.swipes))),
  `Opposite fixture values = intake-derived values from flipped swipes (${OPPOSITE_VALUES.join(", ")})`,
);
check(oppositeDef.id === "family_first", `Opposite swipes persona = Family First (got ${oppositeDef.id})`);
check(JSON.stringify(m) !== JSON.stringify(opp), "Maya vs opposite swipes: plans differ");
check(
  JSON.stringify(m.matches.map((x) => x.productId)) !== JSON.stringify(j.matches.map((x) => x.productId)),
  "Maya vs Jordan: different matches",
);

console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
process.exit(failures ? 1 : 0);
