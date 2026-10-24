// Runs the engine on the demo personas, validates every plan, and checks the golden rules
// from docs/SPROUT.md and issue #3. Run: npx tsx scripts/check-engine.ts
import studentProfile from "../src/data/mocks/profile.student.json";
import familyProfile from "../src/data/mocks/profile.family.json";
import { flipSwipes, jordan, maya } from "../src/data/personas";
import { personaFromValues } from "../src/data/personaTaxonomy";
import { buildPlanSkeleton } from "../src/lib/server/engine/plan";
import { isCatalogId } from "../src/lib/server/catalog";
import { GoalProfileSchema, PlanSchema } from "../src/types/schemas";
import type { GoalProfile, IntakeAnswers, Plan, ValueTag } from "../src/types";

let failures = 0;
const check = (ok: boolean, msg: string) => {
  if (!ok) failures++;
  console.log(`${ok ? "  ok  " : "  FAIL"} ${msg}`);
};

const mayaProfile = GoalProfileSchema.parse(studentProfile);
const jordanProfile = GoalProfileSchema.parse(familyProfile);

// Opposite swipes: same finances and goals, flipped values -> different persona.
const oppositeValues: ValueTag[] = ["security", "family"];
const oppositeIntake: IntakeAnswers = { ...maya.intake, swipes: flipSwipes(maya.intake.swipes), values: oppositeValues };
const oppositeDef = personaFromValues(oppositeValues);
const oppositeProfile: GoalProfile = {
  ...mayaProfile,
  persona: { id: oppositeDef.id, label: oppositeDef.label, description: oppositeDef.tagline },
  topValues: oppositeValues,
};

const runs: { name: string; plan: Plan }[] = [
  { name: "Maya", plan: buildPlanSkeleton(mayaProfile, maya.snapshot, maya.intake) },
  { name: "Maya (opposite swipes)", plan: buildPlanSkeleton(oppositeProfile, maya.snapshot, oppositeIntake) },
  { name: "Jordan", plan: buildPlanSkeleton(jordanProfile, jordan.snapshot, jordan.intake) },
];

const stageOf = (plan: Plan, id: string) => plan.matches.find((m) => m.productId === id)?.stage;

for (const { name, plan } of runs) {
  console.log(`\n=== ${name}: ${plan.headline}`);
  console.log(`  income ${plan.effectiveMonthlyIncome}, surplus ${plan.monthlySurplus}, cushion target ${plan.emergencyFundTarget}`);
  console.log(`  buckets ${plan.spendingPlan.map((b) => `${b.bucket}=${b.monthlyAmount} (${b.percent}%)`).join(", ")}`);
  console.log(`  allocation ${plan.allocation.map((a) => `${a.goalId}=${a.monthlyAmount}/mo -> ${a.monthsToTarget}mo`).join(", ")}`);
  console.log(`  stepOne: [${plan.stepOne.kind}] ${plan.stepOne.title}`);
  for (const m of plan.matches) {
    const unlock = m.unlockTrigger ? ` | ${JSON.stringify(m.unlockTrigger)} "${m.unlockCondition}"` : "";
    console.log(`  ${m.stage.padEnd(5)} ${String(m.score).padStart(3)} ${m.goalId.padEnd(16)} ${m.productId}${unlock}`);
  }
  for (const s of plan.steps) console.log(`  step ${s.order} [${s.stage}/${s.kind}] m${s.startMonth} ${s.title}`);
  for (const n of plan.notYet) console.log(`  notYet: ${n.reason} (revisit ${n.revisitWhen})`);

  const parsed = PlanSchema.safeParse(plan);
  check(parsed.success, `plan validates${parsed.success ? "" : `: ${JSON.stringify(parsed.error.issues)}`}`);
  check(plan.matches.every((m) => isCatalogId(m.productId)), "all match ids are catalog ids");
  check(plan.matches.some((m) => m.stage === "now"), "has at least one now match");
  check(plan.stepOne.stage === "now" && plan.stepOne.startMonth === 0, "stepOne is now / month 0");
  check(plan.aiUsed === false, "aiUsed false");
  const bucketTotal = plan.spendingPlan.reduce((s, b) => s + b.monthlyAmount, 0);
  check(bucketTotal <= plan.effectiveMonthlyIncome + 0.001 || plan.monthlySurplus <= 0, "buckets never exceed income");
}

const [m, opp, j] = runs.map((r) => r.plan);
console.log("\n=== golden + cross-plan checks");
check(m.effectiveMonthlyIncome === 841.67 && m.monthlySurplus === 191.67, "Maya income 841.67, surplus 191.67");
const bucket = (p: Plan, id: string) => p.spendingPlan.find((b) => b.bucket === id)?.monthlyAmount;
check(
  [bucket(m, "emergency_fund"), bucket(m, "goal_savings"), bucket(m, "guilt_free")].join() === "57,76,57",
  "Maya buckets 57/76/57 (rulebook ~58/77/58, floored)",
);
check(m.stepOne.productId === "student-checking", "Maya stepOne = Student Checking");
check(stageOf(m, "student-checking") === "now", "Maya: Student Checking now");
check(stageOf(m, "savers-goal-cd") === "next", "Maya: Savers Goal CD next");
check(
  m.matches.some((x) => x.productId === "smartsecured-card" && x.stage === "later" && x.unlockTrigger?.kind === "savings_threshold"),
  "Maya: SmartSecured later via savings threshold",
);
check(
  m.matches.some((x) => ["fnb-home-ownership-program", "homeone-mortgage"].includes(x.productId) && x.stage === "later"),
  "Maya: HomeOne / Home Ownership Program later",
);
check(stageOf(m, "learning-center") === "now", "Maya: Learning Center now");
check(m.notYet.some((n) => n.revisitWhen === "after a steady income and 3 months saved"), "Maya: mortgage not-yet");
check(JSON.stringify(m.matches) !== JSON.stringify(opp.matches) || JSON.stringify(m.steps) !== JSON.stringify(opp.steps), "Maya vs opposite swipes: plans differ");
check(
  JSON.stringify(m.matches.map((x) => x.productId)) !== JSON.stringify(j.matches.map((x) => x.productId)),
  "Maya vs Jordan: different matches",
);
check(
  j.matches.some((x) => x.stage === "later" && !!x.unlockCondition && ["mortgage", "home"].some((k) => x.productId.includes(k))),
  "Jordan: mortgage product later with unlockCondition",
);
check(j.notYet.some((n) => n.goalId === "first_home"), "Jordan: not-yet for first home");

console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
process.exit(failures ? 1 : 0);
