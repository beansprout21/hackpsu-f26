// Runs the engine on the demo personas, validates every plan, and checks the Maya golden test
// from docs/SPROUT.md v2 row by row. Run: npx tsx scripts/check-engine.ts
import studentProfile from "../src/data/mocks/profile.student.json";
import familyProfile from "../src/data/mocks/profile.family.json";
import { jordan, maya, mayaOpposite, OPPOSITE_VALUES } from "../src/data/personas";
import { personaFromValues } from "../src/data/personaTaxonomy";
import { buildPlanSkeleton } from "../src/lib/server/engine/plan";
import { getProduct, isCatalogId } from "../src/lib/server/catalog";
import { GoalProfileSchema, PlanSchema } from "../src/types/schemas";
import type { GoalProfile, IntakeAnswers, Plan } from "../src/types";

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

const runs: { name: string; plan: Plan }[] = [
  { name: "Maya", plan: buildPlanSkeleton(mayaProfile, maya.snapshot, maya.intake) },
  { name: "Maya (opposite swipes)", plan: buildPlanSkeleton(oppositeProfile, maya.snapshot, oppositeIntake) },
  { name: "Jordan", plan: buildPlanSkeleton(jordanProfile, jordan.snapshot, jordan.intake) },
];

const BANNED = /\b(only|just|behind|should have|can't afford|waste)\b/i;
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
  check(plan.stepOne.stage === "now" && plan.stepOne.startMonth === 0, "stepOne is now / month 0");
  check(plan.steps.some((s) => s.kind === "habit" && /automate/i.test(s.title)) || /automate/i.test(plan.stepOne.title), "automate habit step present");
  const banned = templateText(plan).filter((t) => BANNED.test(t));
  check(banned.length === 0, `no banned voice words${banned.length ? `: ${JSON.stringify(banned)}` : ""}`);
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

console.log("\n=== Maya golden test (docs/SPROUT.md v2)");
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
check(m.cushionTarget === 650 && m.cushionFillsInMonths === 3, "Cushion: starter $650, fills in 3 months");
check(m.stepOne.productId === "student-checking" && /HUB/.test(m.stepOne.detail), "Step one: Open FNB Student Checking (HUB branch)");
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
  "Later: SmartSecured (savings >= $1,150 or first paycheck)",
);
check(
  m.matches.some(
    (x) =>
      ["fnb-home-ownership-program", "homeone-mortgage", "fha-mortgage", "home-possible-mortgage"].includes(x.productId) &&
      x.stage === "later" &&
      /full-time job/.test(x.unlockCondition ?? "") &&
      /3 months/.test(x.unlockCondition ?? ""),
  ),
  "Later: homebuyer program (full-time job + 3 months saved)",
);
check(m.futureYou.earmarkMonthly === null && /first full-time paycheck/.test(m.futureYou.unlockCondition ?? ""), "Future You: handoff only, unlocks with first full-time paycheck");
check(m.notYet.some((n) => n.revisitWhen === "after a steady income and 3 months saved"), "Not yet: mortgage pre-approval after steady income and 3 months saved");
check(/\$140 a month away/.test(m.sproutSays), "sproutSays leads with the top-value goal's dial lever");

console.log("\n=== Jordan + cross-plan checks");
check(j.fixedShare > 0.6 && j.steps.some((s) => /Big Win/.test(s.title)), "Jordan: high-fixed branch with Big Win step");
check(bucket(j, "emergency_fund")!.monthlyAmount + bucket(j, "goal_savings")!.monthlyAmount === 375 && bucket(j, "guilt_free")?.monthlyAmount === 375, "Jordan: savings 50% / guilt-free 50% of $750 surplus");
check(j.futureYou.earmarkMonthly === null && /60%/.test(j.futureYou.unlockCondition ?? ""), "Jordan: Future You handoff until fixed costs < 60%");
check(j.matches.filter((x) => x.stage === "later").every((x) => x.unlockTrigger?.kind !== "life_event"), "Jordan: later items use savings/credit triggers");
check(j.notYet.some((n) => n.goalId === "first_home"), "Jordan: not-yet for first home");
check(JSON.stringify(m) !== JSON.stringify(opp), "Maya vs opposite swipes: plans differ");
check(
  JSON.stringify(m.matches.map((x) => x.productId)) !== JSON.stringify(j.matches.map((x) => x.productId)),
  "Maya vs Jordan: different matches",
);

console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
process.exit(failures ? 1 : 0);
