// Runs Maya (and Jordan + edge fixtures) through the engine and buildOverview(), and checks the
// "Maya check" in docs/DASHBOARD.md v2 + issue #94 acceptance line by line. Run: npx tsx scripts/check-overview.ts
import studentProfile from "../src/data/mocks/profile.student.json";
import familyProfile from "../src/data/mocks/profile.family.json";
import { jordan, maya } from "../src/data/personas";
import { buildOverview, overviewSteps, type OverviewModel } from "../src/lib/client/overview";
import { ASK_SPROUT_STARTERS } from "../src/lib/client/planCopy";
import { aboutTime, timeSpan } from "../src/lib/client/time";
import { buildPlanSkeleton } from "../src/lib/server/engine/plan";
import { GoalProfileSchema } from "../src/types/schemas";
import type { FinancialSnapshot, GoalProfile, IntakeAnswers } from "../src/types";

let failures = 0;
const check = (ok: boolean, msg: string) => {
  if (!ok) failures++;
  console.log(`${ok ? "  ok  " : "  FAIL"} ${msg}`);
};

const mayaProfile = GoalProfileSchema.parse(studentProfile);
const jordanProfile = GoalProfileSchema.parse(familyProfile);
const run = (snapshot: FinancialSnapshot, profile: GoalProfile = mayaProfile, intake: IntakeAnswers = maya.intake) =>
  buildOverview(buildPlanSkeleton(profile, snapshot, intake), profile, snapshot);

const print = (name: string, o: OverviewModel) => {
  console.log(`\n=== ${name}`);
  console.log(`  persona   ${o.persona.label}: ${o.persona.tagline}`);
  console.log(`  month     ${o.month.sentence} bar ${JSON.stringify(o.month.bar)}`);
  console.log(`  cushion   ${o.cushion.title} | ${o.cushion.progressLine} | pct ${o.cushion.pct} milestone ${o.cushion.milestone}`);
  for (const g of o.goals) console.log(`  goal      [${g.tone}] ${g.line}${g.lever ? ` -> "${g.lever.label}" / "${g.lever.askSprout}"` : ""}`);
  for (const s of o.steps) {
    const extra = [s.feeLine && `fee: ${s.feeLine}`, s.url && `url: ${s.url}`, s.unlock, s.askSprout && `ask: ${s.askSprout}`].filter(Boolean).join(" | ");
    console.log(`  step ${s.n}    [${s.kind}/${s.stage}] ${s.title}: ${s.detail}${extra ? ` (${extra})` : ""}`);
  }
};

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

// Maya check (DASHBOARD.md v2, #94)
const m = run(maya.snapshot);
print("Maya", m);
console.log("\n=== Maya check (docs/DASHBOARD.md v2, #94)");
check(m.persona.label === "Experience Collector" && m.persona.tagline === "You'd rather have stories than stuff, so let's fund the stories.", "Persona chip: Experience Collector + taxonomy tagline");
check(m.nextMove.title === "Move $20 into your travel fund right now." && m.nextMove.detail === "You'll put $91 a month toward it. This starts it." && !m.nextMove.link, "Next move: rule D5 templates ($91), no link");
check(m.month.sentence === "Your $1,133 a month: $650 for fixed costs, $483 to work with.", `Month: "${m.month.sentence}"`);
check(m.month.income === 1133 && m.month.fixed === 650 && m.month.toWorkWith === 483, "Month numbers: $1,133 / $650 / $483");
check(JSON.stringify(m.month.bar) === JSON.stringify({ fixed: 650, cushion: 113, goals: 113, guiltFree: 257 }), "Month bar (4 parts): $650 / $113 / $113 / $257");
check(m.cushion.title === "Your safety cushion: $1,950", `Cushion title: "${m.cushion.title}"`);
check(m.cushion.progressLine === "$400 of $1,950 · 1 month covered in 3 months · full in 14 months", `Cushion: "${m.cushion.progressLine}"`);
check(m.cushion.saved === 400 && m.cushion.target === 1950 && m.cushion.milestone === 650 && m.cushion.milestoneInMonths === 3 && m.cushion.fullInMonths === 14 && !m.cushion.met && m.cushion.pct === 21, "Cushion numbers: $400 / $1,950, milestone $650 in 3, full in 14, 21%");
check(m.cushion.reason === "If money stops coming in for up to 3 months, your rent and bills are still covered." && m.cushion.note === "Already have savings set aside? It counts.", "Cushion reason + note");
const travel = m.goals.find((g) => g.goalId === "travel");
check(travel?.line === "Travel fund is $118 a month away." && travel.tone === "gap", `Goals: "${travel?.line}"`);
check(travel?.lever?.label === "See what moving $118 from guilt-free does" && travel.lever.askSprout === "What if I move $118 a month from guilt-free to my travel fund?", `P1 lever: "${travel?.lever?.label}"`);
const credit = m.goals.find((g) => g.goalId === "credit_building");
check(credit?.line === "Credit building: costs time, not money. Start by checking your free credit report." && !credit.lever, `Credit line (habit): "${credit?.line}"`);
const home = m.goals.find((g) => g.goalId === "first_home");
check(home?.line === "Home fund: $22 a month going in." && home.tone === "on_path" && !home.lever, `Home line: "${home?.line}"`);
check(m.goals.filter((g) => g.lever).length === 1, "Exactly one lever button (P1)");

const four = overviewSteps(m);
check(four.length === 4 && four.map((s) => s.n).join() === "1,2,3,4", "Overview shows 4 numbered steps");
check(four[0].kind === "move" && four[0].title === m.nextMove.title && four[0].askSprout === "Why this first?", `Step 1: move "${four[0].title}"`);
check(
  four[1].kind === "product" && four[1].productId === "student-checking" && four[1].title === "Open FNB Student Checking to hold it" &&
    four[1].feeLine === "No monthly fee on Student Checking" && four[1].url === "https://www.fnb-online.com/personal/checking-savings/checking/student-checking",
  `Step 2: "${four[1].title}" (fee line + URL)`,
);
check(four[2].kind === "product" && four[2].productId === "savers-goal-cd" && four[2].stage === "next" && !!four[2].feeLine && !!four[2].url, `Step 3: "${four[2].title}"`);
check(
  four[3].kind === "product" && four[3].productId === "smartsecured-card" && four[3].stage === "later" &&
    /^Unlocks when your savings reach \$1,150/.test(four[3].unlock ?? "") && /first paycheck/.test(four[3].unlock ?? ""),
  `Step 4: "${four[3].title}" (${four[3].unlock})`,
);
check(m.steps.some((s) => s.kind === "habit" && s.title === "Check your free credit report" && s.url === "https://www.annualcreditreport.com"), "Credit habit step follows in the full list (Roadmap)");
check(m.steps.filter((s) => s.kind === "product").every((s) => words(s.detail) <= 20 && !!s.url), "Product steps: one sentence <= 20 words, catalog URL");
check(m.fnbFit?.productId === m.steps[1].productId && m.path.map((p) => p.productId).join() === "student-checking,savers-goal-cd,smartsecured-card", "Deprecated fnbFit/path mirror steps 2-4");
check(JSON.stringify(ASK_SPROUT_STARTERS) === JSON.stringify(["Why this first?", "What if I save $50 more a month?", "When can I get a credit card?"]), "Ask Sprout starter questions");

console.log("\n=== Time formatter (DASHBOARD.md v2)");
check([1, 14, 23].map(aboutTime).join("|") === "about 1 month|about 14 months|about 23 months", "Under 24 months: months");
check([24, 30, 192, 144].map(aboutTime).join("|") === "about 2 years|about 3 years|about 16 years|about 12 years", "24+ months: whole years, rounded");
check(aboutTime(682) === "more than 50 years" && timeSpan(601) === "more than 50 years" && timeSpan(600) === "50 years", "Over 50 years: capped");

console.log("\n=== Fixtures");
const broke = run({ ...maya.snapshot, monthlyFixedCosts: 1200 });
print("Surplus <= 0 (fixed $1,200)", broke);
check(broke.month.sentence === "Right now your costs use everything coming in. Your next move finds some breathing room.", "Surplus <= 0: month sentence");
check(broke.nextMove.title === "Open your bank app and find last week's 3 biggest buys." && broke.steps[0].title === broke.nextMove.title, "Surplus <= 0: Step one row 1 is step 1");
check(JSON.stringify(broke.month.bar) === JSON.stringify({ fixed: 1200, cushion: 0, goals: 0, guiltFree: 0 }), "Surplus <= 0: bar is all fixed costs");
const full = run({ ...maya.snapshot, savingsBalance: 2500 });
print("Cushion met (savings $2,500)", full);
check(full.cushion.met && full.cushion.progressLine === "Your safety cushion is full. Every savings dollar now goes to your goals." && full.cushion.pct === 100, "Cushion met: full sentence, 100%");
const passed = run({ ...maya.snapshot, savingsBalance: 800 });
check(passed.cushion.progressLine === "$800 of $1,950 · full in 11 months", `Milestone passed: dropped from the line ("${passed.cushion.progressLine}")`);
const creditGoal = mayaProfile.goals.find((g) => g.id === "credit_building")!;
const credit1Intake: IntakeAnswers = { ...maya.intake, goals: [{ id: "credit_building", priority: 1, horizonMonths: 12, why: "" }] };
const credit1Profile: GoalProfile = { ...mayaProfile, goals: [{ ...creditGoal, priority: 1 }] };
const c1 = run(maya.snapshot, credit1Profile, credit1Intake);
print("Credit habit only", c1);
check(c1.nextMove.title === "Check your free credit report now." && c1.nextMove.link === "https://www.annualcreditreport.com", "Rule D2 Step one (no money goals) carries the annualcreditreport.com link");
check(!c1.steps.some((s) => s.kind === "habit" && s.title === "Check your free credit report"), "Credit habit is not repeated after Step one");
// Duplicate goal ids in a profile (e.g. an AI profile repeating a goal) still give one line each.
const dupProfile: GoalProfile = { ...mayaProfile, goals: [...mayaProfile.goals, { ...mayaProfile.goals[2], priority: 3 }] };
const dup = run(maya.snapshot, dupProfile);
check(new Set(dup.goals.map((g) => g.goalId)).size === dup.goals.length, "Duplicate goal ids: one line per goal id");

const j = run(jordan.snapshot, jordanProfile, jordan.intake);
print("Jordan", j);
check(j.goals.every((g) => g.goalId !== "emergency_fund"), "Jordan: emergency_fund goal is the safety cushion block, not a goal line");
check(j.steps[1]?.productId === "freestyle-checking" && j.steps[1].title === "Open Freestyle Checking to hold it", `Jordan: step 2 is the top now account, not a tool (${j.steps[1]?.title})`);
check(j.month.sentence === "Your $2,400 a month: $1,650 for fixed costs, $750 to work with.", `Jordan month: "${j.month.sentence}"`);

console.log("\n=== Wording rules (all runs)");
for (const [name, o] of [["Maya", m], ["Surplus <= 0", broke], ["Cushion met", full], ["Credit habit only", c1], ["Jordan", j]] as const) {
  check(o.goals.slice(1).every((g) => g.tone !== "gap" && !g.lever && !/off track|behind|short/i.test(g.line)), `${name}: no gap tone, lever, or off-track wording below P1`);
  const all = [
    o.nextMove.title,
    o.nextMove.detail,
    o.month.sentence,
    o.cushion.title,
    o.cushion.progressLine,
    ...o.goals.map((g) => g.line),
    ...o.steps.flatMap((s) => [s.title, s.detail, s.feeLine ?? "", s.unlock ?? ""]),
  ];
  check(!all.some((t) => /\b(only|just|behind|should have|can't afford|waste)\b/i.test(t)), `${name}: no banned voice words`);
  check(!all.some((t) => /(?<!safety )\bcushion\b/i.test(t)), `${name}: always "safety cushion"`);
  check(!all.some((t) => /10\+/.test(t)), `${name}: no "10+ years"`);
  check(!o.goals.some((g) => /(credit building|everyday banking):.*\$/i.test(g.line)), `${name}: no dollars on habit lines`);
}

console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
process.exit(failures ? 1 : 0);
