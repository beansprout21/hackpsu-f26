// Runs the engine on the demo personas plus Step one fixtures, validates every plan, and checks
// the Maya golden test from docs/SPROUT.md v3.2 row by row. Run: npx tsx scripts/check-engine.ts
import studentProfile from "../src/data/mocks/profile.student.json";
import familyProfile from "../src/data/mocks/profile.family.json";
import { flipSwipes, jordan, maya, mayaOpposite, OPPOSITE_VALUES } from "../src/data/personas";
import { deriveValues } from "../src/components/intake/draft";
import { personaFromValues } from "../src/data/personaTaxonomy";
import { scenarios } from "../src/data/scenarios";
import { buildOverview } from "../src/lib/client/overview";
import { explain } from "../src/lib/ai/chat";
import { fallbackProfile } from "../src/lib/ai/profile";
import { wordCount, sentencesOf, TEXT_BUDGET } from "../src/lib/ai/plan";
import { buildPlanSkeleton } from "../src/lib/server/engine/plan";
import { monthsToTarget } from "../src/lib/server/engine/math";
import { getProduct, isCatalogId } from "../src/lib/server/catalog";
import { GoalProfileSchema, PlanSchema } from "../src/types/schemas";
import type { CreditBand, FinancialSnapshot, GoalAnswer, GoalId, GoalProfile, IntakeAnswers, Plan } from "../src/types";

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
  row2: fixture("Row 2: no money goals, credit building habit", withGoals([{ id: "credit_building", priority: 1, horizonMonths: 12, why: "" }]), maya.snapshot),
  creditFirst: fixture(
    "Credit habit ranked first, travel second (habits are never P1)",
    withGoals([
      { id: "credit_building", priority: 1, horizonMonths: 12, why: "" },
      { id: "travel", priority: 2, horizonMonths: 12, targetAmount: 2500, why: "study abroad in Japan" },
    ]),
    maya.snapshot,
  ),
  bothHabits: fixture(
    "Both habits + travel",
    withGoals([
      { id: "travel", priority: 1, horizonMonths: 12, targetAmount: 2500, why: "study abroad in Japan" },
      { id: "credit_building", priority: 2, horizonMonths: 12, why: "" },
      { id: "everyday_banking", priority: 3, horizonMonths: 6, why: "" },
    ]),
    maya.snapshot,
  ),
  row3: fixture("Row 3: no money goals, everyday banking habit", withGoals([{ id: "everyday_banking", priority: 1, horizonMonths: 6, why: "" }]), maya.snapshot),
  row4: fixture("Row 4: P1 emergency fund", withGoals([{ id: "emergency_fund", priority: 1, horizonMonths: 12, why: "" }]), maya.snapshot),
  noGoals: fixture("Row 4: no goals", noGoalsIntake, maya.snapshot, noGoalsProfile),
  tenDollar: fixture("Row 5 with $10 (surplus $83)", maya.intake, withSnapshot({ monthlyFixedCosts: 1050 })),
  lowCost: fixture("Low-cost student (fixed $150)", maya.intake, withSnapshot({ monthlyFixedCosts: 150 })),
  cushionMet: fixture("Cushion met (savings $2,500)", maya.intake, withSnapshot({ savingsBalance: 2500 })),
  // SPROUT.md v3.4: guilt-free capped at 25% of income; high fixed costs split 60/40 with 5%-of-income minimums.
  capStudent: fixture(
    "v3.4 cap, student ($600/mo, fixed $150)",
    maya.intake,
    withSnapshot({ incomeSources: [{ kind: "family", amount: 600, frequency: "monthly" }], monthlyFixedCosts: 150 }),
  ),
  capSteady: fixture(
    "v3.4 cap, steady income ($3,800/mo, fixed $1,900)",
    { ...maya.intake, lifeStage: "new_grad" },
    withSnapshot({ hasSteadyIncome: true, incomeSources: [{ kind: "job", amount: 3800, frequency: "monthly" }], monthlyFixedCosts: 1900 }),
  ),
  highFixedMin: fixture(
    "v3.4 high fixed, 5% minimum ($2,000/mo, fixed $1,780)",
    { ...maya.intake, lifeStage: "new_grad" },
    withSnapshot({ hasSteadyIncome: true, incomeSources: [{ kind: "job", amount: 2000, frequency: "monthly" }], monthlyFixedCosts: 1780 }),
  ),
  highFixedTiny: fixture(
    "v3.4 high fixed, surplus under 10% ($2,000/mo, fixed $1,850)",
    { ...maya.intake, lifeStage: "new_grad" },
    withSnapshot({ hasSteadyIncome: true, incomeSources: [{ kind: "job", amount: 2000, frequency: "monthly" }], monthlyFixedCosts: 1850 }),
  ),
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

console.log("\n=== Maya golden test (docs/SPROUT.md v3.2)");
check(Math.floor(m.effectiveMonthlyIncome) === 1133, `Effective income $1,133 (got ${m.effectiveMonthlyIncome})`);
check(Math.round(m.fixedShare * 100) === 57 && !m.steps.some((s) => /Big Win/.test(s.title)), "Fixed share 57%, normal case");
check(
  bucket(m, "emergency_fund")?.monthlyAmount === 113 && bucket(m, "goal_savings")?.monthlyAmount === 113,
  "Savings $226 -> cushion $113, goals $113",
);
check(
  [alloc(m, "travel")?.monthlyAmount, alloc(m, "first_home")?.monthlyAmount].join() === "80,33" && !alloc(m, "credit_building"),
  "Goals -> Japan $80, home $33 (rank weights, #106); credit building is a habit with no allocation (v3.2)",
);
check(bucket(m, "guilt_free")?.monthlyAmount === 257 && Math.round(bucket(m, "guilt_free")?.percent ?? 0) === 23, "Guilt-free $257 (23%)");
check(japan?.requiredMonthly === 209 && japan.onTrack === false, "Japan needs $209/mo, has $80 -> off track");
check(
  JSON.stringify(japan?.levers) ===
    JSON.stringify([
      { kind: "turn_up_dial", moveFromGuiltFree: 129 },
      { kind: "more_time", newHorizonMonths: 32 },
      { kind: "smaller_target", reachableAmount: 960 },
    ]),
  "Levers: turn_up_dial $129 first, more_time 32 months, smaller_target $960",
);
check((257 - 129) / m.effectiveMonthlyIncome >= 0.1, "turn_up_dial keeps guilt-free at $128 (>= 10% of income)");
check(
  m.cushionTarget === 1950 && m.emergencyFundTarget === 1950 && m.cushionFillsInMonths === 14,
  `Safety cushion: target $1,950 (3 x $650), $400 counted, $113/mo, full in 14 months (got ${m.cushionTarget}, ${m.cushionFillsInMonths})`,
);
check(monthsToTarget(650, 400, 113) === 3 && /in 3 months/.test(m.sproutSays), 'Milestone "1 month covered" ($650) in 3 months, named in sproutSays');
check(
  m.stepOne.kind === "save" &&
    m.stepOne.title === "Move $20 into your travel fund right now." &&
    m.stepOne.detail === "You'll put $80 a month toward it. This starts it.",
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
check(/\$129 a month away/.test(m.sproutSays), "sproutSays leads with the P1 goal's dial lever ($129)");
check(m.steps.some((s) => s.kind === "learn" && s.title === "Check your free credit report" && s.stage === "now"), 'v3.2: credit building habit step "Check your free credit report" (learn, now)');
check(/credit building \(habit, P2\)/.test(m.bankerSummary) && !/credit building \(\$/.test(m.bankerSummary), "v3.2: banker summary lists credit building as a habit (no target or $)");
check(m.allocation.every((a) => a.goalId !== "credit_building" && a.goalId !== "everyday_banking"), "v3.2: no Allocation row for any habit");

console.log("\n=== Step one fixtures (rule D rows) + cushion edge cases");
const f = fixtures;
check(f.row1.plan.monthlySurplus <= 0 && f.row1.plan.stepOne.kind === "budget" && f.row1.plan.stepOne.title === "Open your bank app and find last week's 3 biggest buys." && f.row1.plan.stepOne.detail === "That's where we'll find your breathing room.", `Row 1: "${f.row1.plan.stepOne.title}"`);
check(f.creditFirst.plan.stepOne.title === "Move $20 into your travel fund right now." && !f.creditFirst.plan.allocation.some((a) => a.goalId === "credit_building"), `Habit ranked first is never P1: "${f.creditFirst.plan.stepOne.title}"`);
check(
  f.bothHabits.plan.steps.some((s) => s.title === "Check your free credit report") &&
    f.bothHabits.plan.steps.some((s) => s.title === "Turn on low-balance alerts") &&
    f.bothHabits.plan.allocation.map((a) => a.goalId).join() === "travel",
  "Both habits: two habit steps, allocation is travel only",
);
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
check(j.stepOne.title === "Move $20 into savings right now." && j.stepOne.detail === "That starts your $4,950 safety cushion.", `Jordan Step one (row 4, v3.1 security tilt): "${j.stepOne.title}" / "${j.stepOne.detail}"`);

console.log("\n=== Jordan + cross-plan checks");
check(j.fixedShare > 0.6 && j.steps.some((s) => /Big Win/.test(s.title)), "Jordan: high-fixed branch with Big Win step");
check(bucket(j, "emergency_fund")!.monthlyAmount + bucket(j, "goal_savings")!.monthlyAmount === 450 && bucket(j, "guilt_free")?.monthlyAmount === 300, "Jordan: v3.4 savings 60% / guilt-free 40% of $750 surplus ($450 / $300)");
check(
  j.cushionTarget === 4950 && bucket(j, "emergency_fund")?.monthlyAmount === 270 && j.cushionFillsInMonths === 14,
  "Jordan: safety cushion $4,950 (3 x $1,650), v3.1 tilt $270 of $450 (60%), full in 14 months",
);

console.log("\n=== v3.4 guilt-free share");
const parts = (p: Plan) => ({
  saved: bucket(p, "emergency_fund")!.monthlyAmount + bucket(p, "goal_savings")!.monthlyAmount,
  guiltFree: bucket(p, "guilt_free")!.monthlyAmount,
  earmark: p.futureYou.earmarkMonthly ?? 0,
});
const cs = parts(f.capStudent.plan);
check(cs.saved === 300 && cs.guiltFree === 150, `Student cap: surplus $450 -> savings $120 + $180 over the 25% cap = $300, guilt-free $150 (got $${cs.saved} / $${cs.guiltFree})`);
const cy = parts(f.capSteady.plan);
check(
  cy.saved === 570 && cy.earmark === 380 && cy.guiltFree === 950,
  `Steady cap: surplus $1,900 -> savings $380 + $190 = $570, Future You $380 unchanged, guilt-free $950 (got $${cy.saved} / $${cy.earmark} / $${cy.guiltFree})`,
);
const hm = parts(f.highFixedMin.plan);
check(
  f.highFixedMin.plan.fixedShare > 0.6 && hm.saved === 120 && hm.guiltFree === 100,
  `High fixed, 5% minimum: surplus $220 -> 60% would leave guilt-free $88 < $100, so savings $120 / guilt-free $100 (got $${hm.saved} / $${hm.guiltFree})`,
);
const ht = parts(f.highFixedTiny.plan);
check(
  f.highFixedTiny.plan.fixedShare > 0.6 && ht.saved === 90 && ht.guiltFree === 60,
  `High fixed, surplus under 10% of income: minimums can't both hold, plain 60/40 of $150 = $90 / $60 (got $${ht.saved} / $${ht.guiltFree})`,
);
for (const { name, plan } of runs) {
  const income = plan.effectiveMonthlyIncome;
  const gf = bucket(plan, "guilt_free")!.monthlyAmount;
  const capped = plan.fixedShare > 0.6 || gf <= Math.floor(0.25 * income);
  const dialOk = plan.allocation.every((a) =>
    a.levers.every((l) => l.kind !== "turn_up_dial" || gf - l.moveFromGuiltFree >= 0.1 * income),
  );
  check(capped && dialOk, `${name}: guilt-free <= 25% of income (normal case); turn_up_dial keeps guilt-free >= 10%`);
}
check(j.futureYou.earmarkMonthly === null && /60%/.test(j.futureYou.unlockCondition ?? ""), "Jordan: Future You handoff until fixed costs < 60%");
check(j.matches.filter((x) => x.stage === "later").every((x) => x.unlockTrigger?.kind !== "life_event"), "Jordan: later items use savings/credit triggers");
check(j.notYet.some((n) => n.goalId === "first_home" && n.revisitWhen === "after your $4,950 safety cushion is full"), "Jordan: not-yet for first home until the safety cushion is full");
check(
  JSON.stringify(OPPOSITE_VALUES) === JSON.stringify(deriveValues(flipSwipes(maya.intake.swipes))),
  `Opposite fixture values = intake-derived values from flipped swipes (${OPPOSITE_VALUES.join(", ")})`,
);
// #96: swipe card 2 right is now security, so the flipped swipes tally security first.
check(oppositeDef.id === "safety_builder", `Opposite swipes persona = Safety Builder (got ${oppositeDef.id})`);
check(JSON.stringify(m) !== JSON.stringify(opp), "Maya vs opposite swipes: plans differ");
// v3.1 proof moment: a family top value tilts the plan cushion-first, so the plan visibly changes.
check(
  opp.stepOne.title === "Move $20 into savings right now." && opp.stepOne.title !== m.stepOne.title,
  `Opposite swipes: Step one "${opp.stepOne.title}" (row 4), not Maya's`,
);
check(
  bucket(opp, "emergency_fund")?.monthlyAmount === 135 && bucket(opp, "goal_savings")?.monthlyAmount === 91 &&
    bucket(opp, "emergency_fund")?.monthlyAmount !== bucket(m, "emergency_fund")?.monthlyAmount,
  `Opposite swipes: savings $226 split 60/40 -> cushion $135, goals $91 (got ${bucket(opp, "emergency_fund")?.monthlyAmount} / ${bucket(opp, "goal_savings")?.monthlyAmount})`,
);
check(
  JSON.stringify(opp.allocation.map((a) => a.monthlyAmount)) !== JSON.stringify(m.allocation.map((a) => a.monthlyAmount)),
  `Opposite swipes: different goal amounts (${opp.allocation.map((a) => a.monthlyAmount).join(" / ")} vs ${m.allocation.map((a) => a.monthlyAmount).join(" / ")})`,
);
check(
  [m, opp, j].every((p) => p.matches.every((x) => getProduct(x.productId)?.category !== "student_loan")),
  "v3.1: no student loan in any match",
);
check(
  JSON.stringify(m.matches.map((x) => x.productId)) !== JSON.stringify(j.matches.map((x) => x.productId)),
  "Maya vs Jordan: different matches",
);

// #118: no consumer credit anywhere (matches, steps, not-yet, Overview guide); the only lending is a mortgage /
// homebuyer program for first_home, always `later` with an unlock, never Step one or guide step 2.
console.log("\n=== No consumer loans (#118): scenarios + a goal x credit x income x savings grid");
const LENDING_CATEGORIES = ["mortgage", "home_equity", "personal_loan", "auto_loan", "student_loan"];
const isLending = (id?: string) => {
  const p = id ? getProduct(id) : undefined;
  return !!p && (LENDING_CATEGORIES.includes(p.category) || (p.category === "small_business" && /\b(loan|line of credit)\b/i.test(p.name)));
};
const isMortgage = (id?: string) => !!id && getProduct(id)?.category === "mortgage";
const lendingRuns: { name: string; plan: Plan; profile: GoalProfile; snapshot: FinancialSnapshot }[] = scenarios.map(
  (sc: { name: string; profile: GoalProfile; snapshot: FinancialSnapshot; intake: IntakeAnswers }) => ({
    name: sc.name,
    plan: buildPlanSkeleton(sc.profile, sc.snapshot, sc.intake),
    profile: sc.profile,
    snapshot: sc.snapshot,
  }),
);
const GRID_GOALS: GoalId[] = ["family", "emergency_fund", "first_home", "small_business", "education", "travel", "credit_building", "everyday_banking"];
const GRID_BANDS: CreditBand[] = ["building", "fair", "good", "excellent"];
for (const goal of GRID_GOALS)
  for (const creditBand of GRID_BANDS)
    for (const steady of [false, true])
      for (const savingsBalance of [200, 12000]) {
        const intake: IntakeAnswers = {
          ...jordan.intake,
          lifeStage: steady ? "young_family" : "student",
          goals: [
            { id: goal, priority: 1, horizonMonths: 24, targetAmount: 5000, why: "" },
            ...(goal === "family" ? [] : [{ id: "family" as const, priority: 2 as const, horizonMonths: 36, targetAmount: 4000, why: "" }]),
          ],
        };
        const snapshot: FinancialSnapshot = {
          ...jordan.snapshot,
          hasSteadyIncome: steady,
          incomeSources: [{ kind: steady ? "job" : "gig", amount: 3200, frequency: "monthly" }],
          monthlyFixedCosts: 1400,
          monthlyDebtPayments: 100,
          savingsBalance,
          creditBand,
        };
        const profile = fallbackProfile(intake);
        lendingRuns.push({ name: `grid ${goal}/${creditBand}/${steady ? "steady" : "irregular"}/${savingsBalance}`, plan: buildPlanSkeleton(profile, snapshot, intake), profile, snapshot });
      }
const lendingProblems: string[] = [];
for (const r of lendingRuns) {
  for (const m of r.plan.matches.filter((x) => isLending(x.productId))) {
    if (!isMortgage(m.productId) || m.goalId !== "first_home" || m.stage !== "later" || !m.unlockCondition) {
      lendingProblems.push(`${r.name}: match ${m.productId} (${m.goalId}, ${m.stage})`);
    }
  }
  for (const n of r.plan.notYet.filter((x) => isLending(x.productId))) {
    if (!isMortgage(n.productId) || n.goalId !== "first_home") lendingProblems.push(`${r.name}: not-yet ${n.productId}`);
  }
  for (const st of r.plan.steps.filter((x) => isLending(x.productId))) {
    if (!isMortgage(st.productId) || st.stage !== "later") lendingProblems.push(`${r.name}: step ${st.order} ${st.productId} (${st.stage})`);
  }
  if (isLending(r.plan.stepOne.productId)) lendingProblems.push(`${r.name}: Step one ${r.plan.stepOne.productId}`);
  const guide = buildOverview(r.plan, r.profile, r.snapshot).steps;
  for (const g of guide.filter((x) => isLending(x.productId))) {
    if (!isMortgage(g.productId) || g.stage !== "later" || g.n <= 2 || !g.unlock) lendingProblems.push(`${r.name}: guide step ${g.n} ${g.productId} (${g.stage})`);
  }
}
check(
  lendingProblems.length === 0,
  `${lendingRuns.length} plans: no consumer loans; mortgages only for first_home, later, with an unlock${lendingProblems.length ? `: ${lendingProblems.slice(0, 5).join("; ")}${lendingProblems.length > 5 ? ` (+${lendingProblems.length - 5})` : ""}` : ""}`,
);
const steadyFull = lendingRuns.find((r) => r.name === "grid first_home/good/steady/12000");
const homeMatch = steadyFull?.plan.matches.find((m) => isMortgage(m.productId));
check(
  homeMatch?.stage === "later" && homeMatch.unlockCondition === "When you're ready to buy (your safety cushion is already full)",
  `Steady income + full safety cushion: homebuyer program stays later ("${homeMatch?.unlockCondition}")`,
);

// #124: user-facing engine text says "safety cushion" (never "emergency fund") and 24+ month durations as years.
console.log("\n=== Engine template wording (#124): scenarios + the #118 grid");
const userFacing = (p: Plan) => [
  p.headline,
  p.sproutSays,
  p.stepOne.title,
  p.stepOne.detail,
  p.bankerSummary,
  p.futureYou.handoff,
  p.futureYou.unlockCondition ?? "",
  ...p.spendingPlan.map((b) => b.note),
  ...p.matches.flatMap((m) => [m.explanation, m.unlockCondition ?? ""]),
  ...p.steps.flatMap((x) => [x.title, x.detail]),
  ...p.notYet.flatMap((n) => [n.reason, n.revisitWhen]),
];
const wordingProblems: string[] = [];
for (const r of lendingRuns) {
  for (const t of userFacing(r.plan)) {
    if (/emergency fund/i.test(t)) wordingProblems.push(r.name + ': "emergency fund" in "' + t.slice(0, 90) + '"');
    const long = [...t.matchAll(/\b(\d+) months\b/g)].find((m) => Number(m[1]) >= 24);
    if (long) wordingProblems.push(r.name + ': "' + long[0] + '" in "' + t.slice(0, 90) + '"');
  }
}
check(
  wordingProblems.length === 0,
  lendingRuns.length + " plans: no \"emergency fund\" and no 24+ \"N months\" in user-facing engine text" +
    (wordingProblems.length ? ": " + wordingProblems.slice(0, 4).join("; ") + (wordingProblems.length > 4 ? " (+" + (wordingProblems.length - 4) + ")" : "") : ""),
);
check(/first home \(\$15,000 in 5 years, P1/.test(j.bankerSummary), "Jordan banker summary: first home in 5 years (not 60 months)");

// #126: every skeleton is PlanSchema-valid (max 2 matches per goal), over 3,000 seeded random users that
// lean on the safety cushion; small-business products only for a small_business goal.
console.log("\n=== Schema-valid plans (#126): 3,000 seeded random users");
let seed126 = 12601;
const rnd = () => ((seed126 = (seed126 * 1103515245 + 12345) % 2147483648) / 2147483648);
const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rnd() * xs.length)];
const MONEY_GOALS: GoalId[] = ["emergency_fund", "travel", "first_home", "family", "education", "small_business"];
const HABIT_IDS: GoalId[] = ["credit_building", "everyday_banking"];
const LIFE: IntakeAnswers["lifeStage"][] = ["student", "new_grad", "young_family"];
const BANDS: CreditBand[] = ["building", "fair", "good", "excellent", "unsure"];
const VALUES = ["freedom", "security", "experiences", "family", "growth", "simplicity"] as const;
const invalid: string[] = [];
const overCap: string[] = [];
const businessLeak: string[] = [];
for (let i = 0; i < 3000; i++) {
  const money = [...MONEY_GOALS].sort(() => rnd() - 0.5).slice(0, 1 + Math.floor(rnd() * 3));
  if (rnd() < 0.6 && !money.includes("emergency_fund")) money[0] = "emergency_fund";
  const habits = HABIT_IDS.filter(() => rnd() < 0.35);
  const goals: GoalAnswer[] = [...money, ...habits].map((id, k) => ({
    id,
    priority: (Math.min(k, 2) + 1) as 1 | 2 | 3,
    horizonMonths: pick([6, 12, 24, 60, 120]),
    ...(rnd() < 0.5 ? { targetAmount: pick([500, 2000, 8000, 20000]) } : {}),
    why: "",
  }));
  const steady = rnd() < 0.5;
  const income = pick([0, 600, 1500, 3200, 6000]);
  const intake: IntakeAnswers = {
    ...maya.intake,
    lifeStage: pick(LIFE),
    values: [pick(VALUES), pick(VALUES)].filter((v, k, a) => a.indexOf(v) === k),
    goals,
  };
  const snapshot: FinancialSnapshot = {
    hasSteadyIncome: steady,
    incomeSources: income ? [{ kind: steady ? "job" : "gig", amount: income, frequency: "monthly" }] : [],
    monthlyFixedCosts: pick([150, 650, 1400, 2500]),
    monthlyDebtPayments: pick([0, 0, 150, 400]),
    savingsBalance: pick([0, 400, 2500, 15000]),
    creditBand: pick(BANDS),
    isFnbCustomer: rnd() < 0.3,
  };
  const profile = fallbackProfile(intake);
  const plan = buildPlanSkeleton(profile, snapshot, intake);
  const parsed = PlanSchema.safeParse(plan);
  if (!parsed.success) invalid.push("user " + i + ": " + parsed.error.issues[0]?.message);
  const perGoal = new Map<string, number>();
  for (const m of plan.matches) perGoal.set(m.goalId, (perGoal.get(m.goalId) ?? 0) + 1);
  for (const [g, n] of perGoal) if (n > 2) overCap.push("user " + i + ": " + g + " has " + n);
  if (!goals.some((g) => g.id === "small_business")) {
    const biz = plan.matches.find((m) => getProduct(m.productId)?.category === "small_business");
    if (biz) businessLeak.push("user " + i + ": " + biz.productId + " (" + biz.goalId + ")");
  }
}
check(invalid.length === 0, "3,000 users: every skeleton passes PlanSchema" + (invalid.length ? " (" + invalid.length + " invalid, e.g. " + invalid.slice(0, 2).join("; ") + ")" : ""));
check(overCap.length === 0, "3,000 users: max 2 matches per goal" + (overCap.length ? " (" + overCap.length + ", e.g. " + overCap.slice(0, 2).join("; ") + ")" : ""));
check(businessLeak.length === 0, "3,000 users: small-business products only with a small_business goal" + (businessLeak.length ? " (" + businessLeak.length + ", e.g. " + businessLeak.slice(0, 2).join("; ") + ")" : ""));
const cushionUser = lendingRuns.find((r) => r.name === "grid emergency_fund/good/steady/200");
check(
  !!cushionUser && cushionUser.plan.matches.some((m) => m.productId === "firstrate-savings") && cushionUser.plan.matches.filter((m) => m.goalId === "emergency_fund").length <= 2,
  "Safety cushion goal keeps its savings home (FirstRate Savings) within 2 matches",
);

// #130: no retirement account (IRA) for any goal; no credit card for the safety cushion. Reuses the #126 sample.
console.log("\n=== Product fit (#130): no IRA, no credit card for the safety cushion");
const fitProblems: string[] = [];
seed126 = 13001;
for (let i = 0; i < 2000; i++) {
  const goals: GoalAnswer[] = [...MONEY_GOALS]
    .sort(() => rnd() - 0.5)
    .slice(0, 1 + Math.floor(rnd() * 3))
    .map((id, k) => ({ id, priority: (k + 1) as 1 | 2 | 3, horizonMonths: pick([12, 36, 120]), why: "" }));
  const intake: IntakeAnswers = { ...jordan.intake, lifeStage: pick(LIFE), goals };
  const snapshot: FinancialSnapshot = {
    ...jordan.snapshot,
    hasSteadyIncome: rnd() < 0.5,
    incomeSources: [{ kind: "job", amount: pick([1500, 3200, 6000]), frequency: "monthly" }],
    savingsBalance: pick([0, 2500, 15000]),
    creditBand: pick(BANDS),
    isFnbCustomer: rnd() < 0.3,
  };
  const profile = fallbackProfile(intake);
  const plan = buildPlanSkeleton(profile, snapshot, intake);
  for (const m of plan.matches) {
    const p = getProduct(m.productId);
    if (p && /\bIRA\b|retirement/i.test(p.name + " " + p.forWho)) fitProblems.push("user " + i + ": " + m.productId + " (" + m.goalId + ")");
    if (p?.category === "credit_card" && m.goalId === "emergency_fund") fitProblems.push("user " + i + ": " + m.productId + " for the safety cushion");
    if (m.productId === "cardguard" && m.goalId === "emergency_fund") fitProblems.push("user " + i + ": CardGuard for the safety cushion");
  }
}
check(fitProblems.length === 0, "2,000 users: no retirement account, no credit card or CardGuard for the safety cushion" + (fitProblems.length ? " (" + fitProblems.length + ", e.g. " + fitProblems.slice(0, 2).join("; ") + ")" : ""));

// #139: the Ask Sprout when-unlock "Meanwhile" line reads right with plural product names ("Mortgage calculators").
console.log("\n=== Ask Sprout when-unlock wording (#139): every later match in scenarios + the #118 grid");
const meanwhileProblems: string[] = [];
let meanwhileLines = 0;
for (const r of lendingRuns) {
  for (const x of r.plan.matches.filter((y) => y.stage === "later")) {
    const t = explain({ kind: "when_unlock", productId: x.productId }, "When can I get it?", r.profile, r.plan, r.snapshot)?.template ?? "";
    const line = t.match(/Meanwhile, [^.]*\./)?.[0];
    if (!line) continue;
    meanwhileLines++;
    if (/\bgets you ready\b/.test(line)) meanwhileProblems.push(r.name + ": " + line);
  }
}
check(
  meanwhileLines > 0 && meanwhileProblems.length === 0,
  meanwhileLines + ' when-unlock answers: no singular "gets you ready" after a product name' +
    (meanwhileProblems.length ? " (" + meanwhileProblems.length + ", e.g. " + meanwhileProblems.slice(0, 2).join("; ") + ")" : ""),
);
const jordanHome =
  explain({ kind: "when_unlock", productId: "fnb-home-ownership-program" }, "When can I get the Home Ownership Program?", jordanProfile, j, jordan.snapshot)?.template ?? "";
check(/Meanwhile, Mortgage calculators can get you ready\./.test(jordanHome), 'Jordan when-unlock: "Meanwhile, Mortgage calculators can get you ready." (got: ' + jordanHome.slice(-60) + ")");

// #105 (SPROUT.md v3.3): duplicate goal ids keep the first occurrence (highest priority); the rest are dropped.
console.log("\n=== Duplicate goal ids (#105): Maya with travel twice");
{
  const dupIntake: IntakeAnswers = {
    ...maya.intake,
    goals: [
      { id: "travel", priority: 1, horizonMonths: 12, targetAmount: 2500, why: "" },
      { id: "travel", priority: 2, horizonMonths: 24, targetAmount: 4000, why: "" },
    ],
  };
  const dupPlan = buildPlanSkeleton(fallbackProfile(dupIntake), maya.snapshot, dupIntake);
  const travelRows = dupPlan.allocation.filter((a) => a.goalId === "travel");
  const goalBucket = dupPlan.spendingPlan.find((b) => b.bucket === "goal_savings")?.monthlyAmount ?? 0;
  check(PlanSchema.safeParse(dupPlan).success, "duplicate travel: plan passes PlanSchema");
  check(
    travelRows.length === 1 && travelRows[0].requiredMonthly === Math.ceil(2500 / 12),
    "duplicate travel: one travel allocation, from the P1 entry ($2,500 in 12 months)" + (travelRows.length ? " (required $" + travelRows[0].requiredMonthly + ")" : ""),
  );
  check(
    dupPlan.allocation.filter((a) => a.goalId !== "emergency_fund").reduce((t, a) => t + a.monthlyAmount, 0) === goalBucket,
    "duplicate travel: the whole goal bucket ($" + goalBucket + ") lands on travel",
  );
  check(dupPlan.matches.filter((m) => m.goalId === "travel").length <= 2, "duplicate travel: max 2 travel matches");
  check((dupPlan.bankerSummary.match(/\btravel \(/g) ?? []).length === 1, "duplicate travel: banker summary lists the travel goal once");
}

// #106 (lead 2:15 AM): goal weights go by rank among money goals, so the persona fixture (credit P2, home P3) and the
// intake path (money goals first: home P2, credit P3) give Maya the same numbers.
console.log("\n=== Goal weights by rank (#106): both Maya entry paths");
{
  const byId = (id: GoalId) => maya.intake.goals.find((g) => g.id === id)!;
  const intakePath: IntakeAnswers = {
    ...maya.intake,
    goals: [
      { ...byId("travel"), priority: 1 },
      { ...byId("first_home"), priority: 2 },
      { ...byId("credit_building"), priority: 3 },
    ],
  };
  const viaIntake = buildPlanSkeleton(fallbackProfile(intakePath), maya.snapshot, intakePath);
  const viaFixture = buildPlanSkeleton(fallbackProfile(maya.intake), maya.snapshot, maya.intake);
  const amounts = (p: Plan) => p.allocation.map((a) => a.goalId + " $" + a.monthlyAmount).join(", ");
  check(amounts(viaIntake) !== "" && amounts(viaIntake) === amounts(viaFixture), "Maya, intake path vs fixture: same allocation (" + amounts(viaIntake) + " / " + amounts(viaFixture) + ")");
  check(
    [alloc(viaIntake, "travel")?.monthlyAmount, alloc(viaIntake, "first_home")?.monthlyAmount].join() === "80,33" && viaIntake.sproutSays === viaFixture.sproutSays,
    "Maya, intake path: travel $80, home $33, same sproutSays as the fixture",
  );
}

// #109 (SPROUT.md v3.3): with no surplus, now/next products cost nothing new (education tool, $0 to open, or everyday
// checking/savings funded from savings; Student Checking's unpublished deposit allowed). Everything else is later.
console.log("\n=== No surplus (#109): only products that cost nothing new are now/next");
{
  const costsNothing = (id: string, saved: number) => {
    const p = getProduct(id);
    if (!p) return false;
    if (p.category === "education_tool" || p.minOpeningDeposit === 0) return true;
    if (p.category === "checking" && p.minOpeningDeposit === null && p.keyTerms.some((t) => /no minimum balance/i.test(t))) return true;
    return (p.category === "checking" || p.category === "savings") && p.minOpeningDeposit !== null && p.minOpeningDeposit <= saved;
  };
  // Issue reproduction: Maya's intake, no income, $400 fixed, $100 saved.
  const broke: FinancialSnapshot = { ...maya.snapshot, hasSteadyIncome: false, incomeSources: [], monthlyFixedCosts: 400, monthlyDebtPayments: 0, savingsBalance: 100 };
  const brokePlan = buildPlanSkeleton(mayaProfile, broke, maya.intake);
  const cd = brokePlan.matches.find((m) => m.productId === "savers-goal-cd");
  check(
    brokePlan.monthlySurplus <= 0 && brokePlan.matches.every((m) => m.stage === "later" || costsNothing(m.productId, broke.savingsBalance)),
    "Maya, no income: every now/next match costs nothing new (" + brokePlan.matches.filter((m) => m.stage !== "later").map((m) => m.productId).join(", ") + ")",
  );
  check(!!cd && (cd.stage === "later" && cd.unlockCondition === "When money is coming in each month"), "Maya, no income: Savers Goal CD waits until money is coming in each month" + (cd ? " (" + cd.stage + ")" : ""));

  const noSurplus: string[] = [];
  let noSurplusUsers = 0;
  seed126 = 10901;
  for (let i = 0; i < 1500; i++) {
    const goals: GoalAnswer[] = [...MONEY_GOALS, ...HABIT_IDS]
      .sort(() => rnd() - 0.5)
      .slice(0, 1 + Math.floor(rnd() * 3))
      .map((id, k) => ({ id, priority: (k + 1) as 1 | 2 | 3, horizonMonths: pick([12, 36, 120]), why: "" }));
    const intake: IntakeAnswers = { ...jordan.intake, lifeStage: pick(LIFE), goals };
    const fixed = pick([300, 900, 1800]);
    const snapshot: FinancialSnapshot = {
      ...jordan.snapshot,
      hasSteadyIncome: rnd() < 0.5,
      incomeSources: rnd() < 0.5 ? [] : [{ kind: "job", amount: fixed - pick([0, 100]), frequency: "monthly" }],
      monthlyFixedCosts: fixed,
      monthlyDebtPayments: pick([0, 0, 200]),
      savingsBalance: pick([0, 40, 300, 5000]),
      creditBand: pick(BANDS),
      isFnbCustomer: rnd() < 0.3,
    };
    const plan = buildPlanSkeleton(fallbackProfile(intake), snapshot, intake);
    if (plan.monthlySurplus > 0) continue;
    noSurplusUsers++;
    for (const m of plan.matches)
      if (m.stage !== "later" && !costsNothing(m.productId, snapshot.savingsBalance)) noSurplus.push("user " + i + ": " + m.stage + " " + m.productId);
  }
  check(
    noSurplusUsers > 500 && noSurplus.length === 0,
    noSurplusUsers + " no-surplus users: every now/next product costs nothing new" + (noSurplus.length ? " (" + noSurplus.length + ", e.g. " + noSurplus.slice(0, 3).join("; ") + ")" : ""),
  );
}

// #114: Ask Sprout's "What if I give it more time?" answers the what-if (new time at the current pace), not the gap again.
console.log("\n=== Ask Sprout more-time what-if (#114): Maya's travel fund");
{
  const gapIntent = { kind: "goal_gap", goalId: "travel" } as const;
  const gapAnswer = explain(gapIntent, "How do I close the $129 gap for my travel fund?", mayaProfile, m, maya.snapshot)?.template ?? "";
  const timeAnswer = explain(gapIntent, "What if I give it more time?", mayaProfile, m, maya.snapshot)?.template ?? "";
  check(/\$129 a month away/.test(gapAnswer), "gap answer still leads with the gap: " + gapAnswer.slice(0, 70));
  check(
    timeAnswer === "At $80 a month, your travel fund gets there in about 3 years instead of 12 months. To keep your timeline, move $129 from guilt-free instead.",
    "more-time answer is the what-if: " + timeAnswer,
  );
}

// #144: with no surplus, the gap answer gives the plan's real next move instead of "needs $209 and gets $0" with nothing after.
console.log("\n=== Ask Sprout gap answer with no surplus (#144)");
{
  const broke: FinancialSnapshot = { ...maya.snapshot, hasSteadyIncome: false, incomeSources: [], monthlyFixedCosts: 400, monthlyDebtPayments: 0, savingsBalance: 100 };
  const brokePlan = buildPlanSkeleton(mayaProfile, broke, maya.intake);
  const answer = explain({ kind: "goal_gap", goalId: "travel" }, "How do I close the $209 gap for my travel fund?", mayaProfile, brokePlan, broke)?.template ?? "";
  check(
    answer.startsWith("First we find your breathing room. Your next move: ") &&
      answer.includes(brokePlan.stepOne.title.charAt(0).toLowerCase() + brokePlan.stepOne.title.slice(1).replace(/\.$/, "")) &&
      !/gets \$0/.test(answer),
    "no surplus: gap answer points to Step one: " + answer,
  );
}

console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
process.exit(failures ? 1 : 0);
