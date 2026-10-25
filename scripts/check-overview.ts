// Runs Maya (and Jordan + edge fixtures) through the engine and buildOverview(), and checks the
// "Maya check" in docs/DASHBOARD.md line by line. Run: npx tsx scripts/check-overview.ts
import studentProfile from "../src/data/mocks/profile.student.json";
import familyProfile from "../src/data/mocks/profile.family.json";
import { jordan, maya } from "../src/data/personas";
import { buildOverview, type OverviewModel } from "../src/lib/client/overview";
import { ASK_SPROUT_STARTERS } from "../src/lib/client/planCopy";
import { buildPlanSkeleton } from "../src/lib/server/engine/plan";
import { GoalProfileSchema } from "../src/types/schemas";
import type { FinancialSnapshot } from "../src/types";

let failures = 0;
const check = (ok: boolean, msg: string) => {
  if (!ok) failures++;
  console.log(`${ok ? "  ok  " : "  FAIL"} ${msg}`);
};

const mayaProfile = GoalProfileSchema.parse(studentProfile);
const jordanProfile = GoalProfileSchema.parse(familyProfile);
const run = (snapshot: FinancialSnapshot, profile = mayaProfile, intake = maya.intake) =>
  buildOverview(buildPlanSkeleton(profile, snapshot, intake), profile, snapshot);

const print = (name: string, o: OverviewModel) => {
  console.log(`\n=== ${name}`);
  console.log(`  persona   ${o.persona.label}: ${o.persona.tagline}`);
  console.log(`  next      ${o.nextMove.title} / ${o.nextMove.detail}${o.nextMove.link ? ` [${o.nextMove.link}]` : ""}`);
  console.log(`  fnbFit    ${o.fnbFit ? `${o.fnbFit.name}: ${o.fnbFit.line}` : "none"}`);
  console.log(`  month     ${o.month.sentence} bar ${JSON.stringify(o.month.bar)}`);
  console.log(`  cushion   ${o.cushion.title} | ${o.cushion.progressLine} | pct ${o.cushion.pct} milestone ${o.cushion.milestone}`);
  for (const g of o.goals) console.log(`  goal      [${g.tone}] ${g.line}${g.lever ? ` -> "${g.lever.label}" / "${g.lever.askSprout}"` : ""}`);
  for (const p of o.path) console.log(`  path      ${p.stage}: ${p.title}: ${p.detail}${p.unlock ? ` ${p.unlock}` : ""}`);
};

// Maya check (DASHBOARD.md)
const m = run(maya.snapshot);
print("Maya", m);
console.log("\n=== Maya check (docs/DASHBOARD.md)");
check(m.persona.label === "Experience Collector" && m.persona.tagline === "You'd rather have stories than stuff, so let's fund the stories.", "Persona chip: Experience Collector + taxonomy tagline");
check(m.nextMove.title === "Move $20 into your travel fund right now." && m.nextMove.detail === "You'll put $69 a month toward it. This starts it." && !m.nextMove.link, "Next move: rule D5 templates, no link");
check(m.fnbFit?.productId === "student-checking" && m.fnbFit.name === "FNB Student Checking", `FNB fit: FNB Student Checking (got ${m.fnbFit?.name})`);
check(/No monthly fee on Student Checking/i.test(m.fnbFit?.line ?? ""), "FNB fit line leads with the fee line");
check(m.month.sentence === "You have $483 a month to work with." && m.month.toWorkWith === 483, `Month: "${m.month.sentence}"`);
check(JSON.stringify(m.month.bar) === JSON.stringify({ cushion: 113, goals: 113, guiltFree: 257 }), "Month bar $113 / $113 / $257");
check(m.cushion.title === "Your safety cushion: $1,950", `Cushion title: "${m.cushion.title}"`);
check(m.cushion.progressLine === "$400 of $1,950 · 1 month covered in 3 months · full in 14 months", `Cushion: "${m.cushion.progressLine}"`);
check(m.cushion.saved === 400 && m.cushion.target === 1950 && m.cushion.milestone === 650 && m.cushion.milestoneInMonths === 3 && m.cushion.fullInMonths === 14 && !m.cushion.met && m.cushion.pct === 21, "Cushion numbers: $400 / $1,950, milestone $650 in 3, full in 14, 21%");
check(m.cushion.reason === "If money stops coming in for up to 3 months, your rent and bills are still covered." && m.cushion.note === "Already have savings set aside? It counts.", "Cushion reason + note");
const travel = m.goals.find((g) => g.goalId === "travel");
check(travel?.line === "Travel fund is $140 a month away." && travel.tone === "gap", `Goals: "${travel?.line}"`);
check(travel?.lever?.label === "See what moving $140 from guilt-free does" && travel.lever.askSprout === "What if I move $140 a month from guilt-free to my travel fund?", `P1 lever: "${travel?.lever?.label}"`);
const credit = m.goals.find((g) => g.goalId === "credit_building");
check(credit?.line === "Credit building: on your path, about 18 months at your pace." && credit.tone === "on_path" && !credit.lever, `Credit line: "${credit?.line}"`);
const home = m.goals.find((g) => g.goalId === "first_home");
check(!!home && home.line.startsWith("Home fund: starts growing after ") && home.tone === "later" && !home.lever, `Home line: "${home?.line}"`);
check(m.goals.filter((g) => g.lever).length === 1, "Exactly one lever button (P1)");
check(m.path.length === 3 && m.path.map((p) => `${p.stage}:${p.productId}`).join() === "now:student-checking,next:savers-goal-cd,later:smartsecured-card", `Path: ${m.path.map((p) => `${p.stage}:${p.productId}`).join(", ")}`);
const later = m.path.find((p) => p.stage === "later");
check(/^Unlocks when your savings reach \$1,150/.test(later?.unlock ?? "") && /first paycheck/.test(later?.unlock ?? ""), `Later unlock: "${later?.unlock}"`);
check(m.path.every((p) => p.detail.split(/\s+/).length <= 20), "Path details are one sentence of <= 20 words");
check(JSON.stringify(ASK_SPROUT_STARTERS) === JSON.stringify(["Why this first?", "What if I save $50 more a month?", "When can I get a credit card?"]), "Ask Sprout starter questions");

console.log("\n=== Fixtures");
const broke = run({ ...maya.snapshot, monthlyFixedCosts: 1200 });
print("Surplus <= 0 (fixed $1,200)", broke);
check(broke.month.sentence === "Right now your costs use everything coming in. Your next move finds some breathing room.", "Surplus <= 0: month sentence");
check(broke.nextMove.title === "Open your bank app and find last week's 3 biggest buys.", "Surplus <= 0: Step one row 1");
check(JSON.stringify(broke.month.bar) === JSON.stringify({ cushion: 0, goals: 0, guiltFree: 0 }), "Surplus <= 0: empty bar");
const full = run({ ...maya.snapshot, savingsBalance: 2500 });
print("Cushion met (savings $2,500)", full);
check(full.cushion.met && full.cushion.progressLine === "Your safety cushion is full. Every savings dollar now goes to your goals." && full.cushion.pct === 100, "Cushion met: full sentence, 100%");
const passed = run({ ...maya.snapshot, savingsBalance: 800 });
check(passed.cushion.progressLine === "$800 of $1,950 · full in 11 months", `Milestone passed: dropped from the line ("${passed.cushion.progressLine}")`);
const credit1Intake = { ...maya.intake, goals: [{ id: "credit_building" as const, priority: 1 as const, horizonMonths: 12, why: "" }] };
const credit1Profile = { ...mayaProfile, goals: [{ ...mayaProfile.goals.find((g) => g.id === "credit_building")!, priority: 1 as const }] };
const c1 = run(maya.snapshot, credit1Profile, credit1Intake);
check(c1.nextMove.title === "Check your free credit report now." && c1.nextMove.link === "https://www.annualcreditreport.com", "Rule D2 Step one carries the annualcreditreport.com link");

const j = run(jordan.snapshot, jordanProfile, jordan.intake);
print("Jordan", j);
check(j.goals.every((g) => g.goalId !== "emergency_fund"), "Jordan: emergency_fund goal is the cushion block, not a goal line");
check(j.path.length <= 3 && j.fnbFit?.productId === j.path[0]?.productId, "Jordan: path max 3, Now = FNB fit");
check(j.fnbFit?.productId === "freestyle-checking" && /^No checking account yet\? Freestyle Checking/.test(j.fnbFit.line), `Jordan: FNB fit is the top now account, not a tool (got ${j.fnbFit?.name})`);

console.log("\n=== Wording rules (all runs)");
for (const [name, o] of [["Maya", m], ["Surplus <= 0", broke], ["Cushion met", full], ["Jordan", j]] as const) {
  const nonP1 = o.goals.slice(1);
  check(nonP1.every((g) => g.tone !== "gap" && !g.lever && !/off track|behind|short/i.test(g.line)), `${name}: no gap tone, lever, or off-track wording below P1`);
  const all = [o.nextMove.title, o.nextMove.detail, o.fnbFit?.line ?? "", o.month.sentence, o.cushion.title, o.cushion.progressLine, ...o.goals.map((g) => g.line), ...o.path.flatMap((p) => [p.detail, p.unlock ?? ""])];
  check(!all.some((t) => /\b(only|just|behind|should have|can't afford|waste)\b/i.test(t)), `${name}: no banned voice words`);
  check(!all.some((t) => /(?<!safety )\bcushion\b/i.test(t)), `${name}: always "safety cushion"`);
}

console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
process.exit(failures ? 1 : 0);
