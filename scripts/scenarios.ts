// Scenario test (#78): runs every fixture in src/data/scenarios.ts through the engine (no AI),
// prints one Markdown table, flags anything that reads wrong, and writes docs/SCENARIOS.md.
// Uses engine fields; switch the cells to buildOverview strings once #67 merges.
// Run: npm run scenarios
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { scenarios } from "../src/data/scenarios";
import { buildPlanSkeleton } from "../src/lib/server/engine/plan";
import { GOAL_LABELS } from "../src/lib/server/engine/defaults";
import { getProduct } from "../src/lib/server/catalog";
import type { Match, Plan, SpendingBucketId } from "../src/types";

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const cell = (s: string) => s.replace(/\|/g, "\\|").replace(/\n/g, " ");
const productName = (id: string) => getProduct(id)?.name ?? id;
const bucket = (p: Plan, id: SpendingBucketId) => p.spendingPlan.find((b) => b.bucket === id)?.monthlyAmount ?? 0;

function monthLine(p: Plan): string {
  if (p.monthlySurplus <= 0) return `Surplus ${usd(p.monthlySurplus)} (income ${usd(p.effectiveMonthlyIncome)}): no room yet`;
  const fy = p.futureYou.earmarkMonthly ? ` / Future You ${usd(p.futureYou.earmarkMonthly)}` : "";
  return `${usd(p.monthlySurplus)} to work with: cushion ${usd(bucket(p, "emergency_fund"))} / goals ${usd(bucket(p, "goal_savings"))} / guilt-free ${usd(bucket(p, "guilt_free"))}${fy}`;
}

function cushionLine(p: Plan, saved: number): string {
  if (saved >= p.cushionTarget) return `${usd(saved)} of ${usd(p.cushionTarget)}: met`;
  const pace = bucket(p, "emergency_fund");
  const fill = p.cushionFillsInMonths ? `, full in ${p.cushionFillsInMonths} mo` : "";
  return `${usd(saved)} of ${usd(p.cushionTarget)}${pace ? `, +${usd(pace)}/mo` : ", not funded yet"}${fill}`;
}

function goalLines(p: Plan, p1Id: string | undefined): string {
  return p.allocation
    .map((a) => {
      const label = GOAL_LABELS[a.goalId];
      const isP1 = a.goalId === p1Id;
      const status = a.onTrack ? "on track" : isP1 ? "gap" : "growing";
      const lever = isP1 && a.levers[0] ? `; lever ${JSON.stringify(a.levers[0]).replace(/"/g, "")}` : "";
      return `${isP1 ? "P1 " : ""}${label}: ${usd(a.monthlyAmount)}/mo of ${usd(a.requiredMonthly)} (${status}${lever})`;
    })
    .join("<br>");
}

function pathLine(p: Plan): string {
  const first = (stage: Match["stage"]) => p.matches.find((m) => m.stage === stage);
  const now = first("now");
  const next = first("next");
  const later = first("later");
  return [
    `Now: ${now ? productName(now.productId) : "none"}`,
    `Next: ${next ? productName(next.productId) : "none"}`,
    `Later: ${later ? `${productName(later.productId)} (${later.unlockCondition ?? "no condition"})` : "none"}`,
  ].join("<br>");
}

// Every user-facing engine string (not catalog facts), for the wording checks.
const engineText = (p: Plan) => [
  p.headline,
  p.sproutSays,
  p.stepOne.title,
  p.stepOne.detail,
  p.futureYou.handoff,
  p.futureYou.unlockCondition ?? "",
  ...p.spendingPlan.map((b) => b.note),
  ...p.matches.flatMap((m) => [m.explanation, m.unlockCondition ?? ""]),
  ...p.steps.flatMap((s) => [s.title, s.detail]),
  ...p.notYet.flatMap((n) => [n.reason, n.revisitWhen]),
];

const OFF_TRACK = /off[ -]track|behind|falling short|a month away/i;

// Collect NaN / Infinity / negative numbers anywhere in the plan. monthlySurplus may be <= 0 by contract.
function badNumbers(value: unknown, path: string, out: string[]): string[] {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) out.push(`${path}=${value}`);
    else if (value < 0 && path !== "monthlySurplus") out.push(`${path}=${value}`);
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => badNumbers(v, `${path}[${i}]`, out));
  } else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) badNumbers(v, path ? `${path}.${k}` : k, out);
  }
  return out;
}

function flagsFor(p: Plan, p1Id: string | undefined): string[] {
  const flags: string[] = [];
  if (p.stepOne.kind === "open" || /\bopen\b/i.test(`${p.stepOne.title} ${p.stepOne.detail}`)) {
    flags.push(`Step one opens an account ("${p.stepOne.title}")`);
  }

  const nonP1 = p.allocation.filter((a) => a.goalId !== p1Id && a.goalId !== "emergency_fund");
  for (const a of nonP1) {
    const label = GOAL_LABELS[a.goalId];
    const hits = engineText(p).filter((t) => t.toLowerCase().includes(label) && OFF_TRACK.test(t));
    if (hits.length) flags.push(`non-P1 ${label} worded as off track: "${hits[0]}"`);
  }

  if (p.cushionTarget < 1000) flags.push(`cushion ${usd(p.cushionTarget)} < $1,000`);

  // Numbers add up: fixed bucket = fixed + debt; savings + Future You + guilt-free = floor(surplus);
  // goal allocations = goal bucket; nothing saved when there's no surplus.
  const fixed = bucket(p, "fixed_costs");
  const expectedFixed = Math.round((p.effectiveMonthlyIncome - p.monthlySurplus) * 100) / 100;
  if (Math.abs(fixed - expectedFixed) > 0.01) flags.push(`fixed bucket ${fixed} != fixed + debt ${expectedFixed}`);
  const earmark = p.futureYou.earmarkMonthly ?? 0;
  const spent = bucket(p, "emergency_fund") + bucket(p, "goal_savings") + bucket(p, "guilt_free") + earmark;
  if (p.monthlySurplus > 0 && spent !== Math.floor(p.monthlySurplus)) {
    flags.push(`buckets ${usd(spent)} != surplus ${usd(Math.floor(p.monthlySurplus))}`);
  }
  if (p.monthlySurplus <= 0 && spent !== 0) flags.push(`saving ${usd(spent)} with no surplus`);
  const goalAlloc = p.allocation.filter((a) => a.goalId !== "emergency_fund").reduce((s, a) => s + a.monthlyAmount, 0);
  if (goalAlloc > 0 && goalAlloc !== bucket(p, "goal_savings")) {
    flags.push(`goal allocations ${usd(goalAlloc)} != goal bucket ${usd(bucket(p, "goal_savings"))}`);
  }

  const bad = badNumbers(p, "", []);
  if (bad.length) flags.push(`NaN/negative: ${bad.slice(0, 3).join(", ")}${bad.length > 3 ? ` (+${bad.length - 3})` : ""}`);
  return flags;
}

const header = [
  "Scenario",
  "Persona",
  "Step one",
  "FNB fit",
  "Month",
  "Cushion",
  "Goals",
  "Path (Now / Next / Later)",
  "⚠",
];
const rows: string[][] = [];
const details: string[] = [];
let flagged = 0;

for (const s of scenarios) {
  const plan = buildPlanSkeleton(s.profile, s.snapshot, s.intake);
  const p1Id = [...s.profile.goals].sort((a, b) => a.priority - b.priority)[0]?.id;
  const fit = plan.matches.find((m) => m.stage === "now");
  const flags = flagsFor(plan, p1Id);
  if (flags.length) {
    flagged++;
    details.push(`- **${s.name}**: ${flags.join("; ")}`);
  }
  rows.push([
    s.name,
    s.profile.persona.label,
    plan.stepOne.title,
    fit ? productName(fit.productId) : "none",
    monthLine(plan),
    cushionLine(plan, s.snapshot.savingsBalance),
    goalLines(plan, p1Id),
    pathLine(plan),
    flags.length ? `⚠ ${flags.length}` : "",
  ]);
}

const table = [
  `| ${header.join(" | ")} |`,
  `| ${header.map(() => "---").join(" | ")} |`,
  ...rows.map((r) => `| ${r.map(cell).join(" | ")} |`),
].join("\n");

const doc = [
  "# Scenarios (generated)",
  "",
  "Generated by `npm run scenarios` (`scripts/scenarios.ts`) from `src/data/scenarios.ts`. Do not edit by hand.",
  "Engine only, no AI; cells use engine fields (not yet `buildOverview` copy, #67).",
  "",
  table,
  "",
  `## ⚠ Flags (${flagged} of ${scenarios.length} scenarios)`,
  "",
  details.length ? details.join("\n") : "None.",
  "",
].join("\n");

writeFileSync(join(__dirname, "..", "docs", "SCENARIOS.md"), doc);
console.log(doc);
console.log(`wrote docs/SCENARIOS.md: ${scenarios.length} scenarios, ${flagged} flagged`);
