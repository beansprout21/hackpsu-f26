// Scenario test (#78): runs every fixture in src/data/scenarios.ts through the engine (no AI) and
// buildOverview() (docs/DASHBOARD.md), prints one Markdown table, flags anything that reads wrong,
// and writes docs/SCENARIOS.md. Run: npm run scenarios
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { scenarios } from "../src/data/scenarios";
import { buildOverview, type OverviewModel } from "../src/lib/client/overview";
import { buildPlanSkeleton } from "../src/lib/server/engine/plan";
import { GOAL_LABELS } from "../src/lib/server/engine/defaults";
import type { Plan, SpendingBucketId } from "../src/types";

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const cell = (s: string) => s.replace(/\|/g, "\|").replace(/\n/g, " ");
const bucket = (p: Plan, id: SpendingBucketId) => p.spendingPlan.find((b) => b.bucket === id)?.monthlyAmount ?? 0;

function monthLine(o: OverviewModel): string {
  const { cushion, goals, guiltFree } = o.month.bar;
  return o.month.toWorkWith > 0
    ? `${o.month.sentence}<br>Bar ${usd(cushion)} / ${usd(goals)} / ${usd(guiltFree)}`
    : o.month.sentence;
}

const goalLines = (o: OverviewModel) =>
  o.goals.map((g) => `${g.line}${g.lever ? ` [${g.lever.label}]` : ""}`).join("<br>") || "(none listed)";

const STAGE_LABEL = { now: "Now", next: "Next", later: "Later" } as const;
const pathLine = (o: OverviewModel) =>
  o.path.map((p) => `${STAGE_LABEL[p.stage]}: ${p.title}${p.unlock ? `. ${p.unlock}` : ""}`).join("<br>") || "(empty)";

// Every user-facing string (engine templates and Overview copy, not catalog facts), for the wording checks.
const userText = (p: Plan, o: OverviewModel) => [
  p.headline,
  p.sproutSays,
  p.futureYou.handoff,
  p.futureYou.unlockCondition ?? "",
  ...p.spendingPlan.map((b) => b.note),
  ...p.matches.flatMap((m) => [m.explanation, m.unlockCondition ?? ""]),
  ...p.steps.flatMap((s) => [s.title, s.detail]),
  ...p.notYet.flatMap((n) => [n.reason, n.revisitWhen]),
  o.nextMove.title,
  o.nextMove.detail,
  o.fnbFit?.line ?? "",
  o.month.sentence,
  o.cushion.progressLine,
  ...o.goals.flatMap((g) => [g.line, g.lever?.label ?? ""]),
  ...o.path.flatMap((x) => [x.detail, x.unlock ?? ""]),
];

const OFF_TRACK = /off[ -]track|behind|falling short|a month away/i;
// "Open your bank app" is fine; opening an account, card, or CD is not.
const OPENS_ACCOUNT = /\bopen\b[^.]*\b(account|checking|savings|card|cd)\b/i;

// Collect NaN / Infinity / negative numbers. monthlySurplus (and the Overview's toWorkWith) may be <= 0 by contract.
function badNumbers(value: unknown, path: string, out: string[]): string[] {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) out.push(`${path}=${value}`);
    else if (value < 0 && !/(monthlySurplus|toWorkWith)$/.test(path)) out.push(`${path}=${value}`);
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => badNumbers(v, `${path}[${i}]`, out));
  } else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) badNumbers(v, path ? `${path}.${k}` : k, out);
  }
  return out;
}

function flagsFor(p: Plan, o: OverviewModel, p1Id: string | undefined): string[] {
  const flags: string[] = [];
  if (p.stepOne.kind === "open" || p.stepOne.productId || OPENS_ACCOUNT.test(`${p.stepOne.title} ${p.stepOne.detail}`)) {
    flags.push(`Step one opens an account ("${p.stepOne.title}")`);
  }

  const nonP1 = p.allocation.filter((a) => a.goalId !== p1Id && a.goalId !== "emergency_fund");
  for (const a of nonP1) {
    const label = GOAL_LABELS[a.goalId];
    const hits = userText(p, o).filter((t) => t.toLowerCase().includes(label) && OFF_TRACK.test(t));
    if (hits.length) flags.push(`non-P1 ${label} worded as off track: "${hits[0]}"`);
  }
  for (const g of o.goals) {
    if (g.goalId !== p1Id && (g.tone === "gap" || g.lever)) flags.push(`non-P1 ${GOAL_LABELS[g.goalId]} has tone "${g.tone}"`);
  }

  if (p.cushionTarget < 1000) flags.push(`cushion ${usd(p.cushionTarget)} < $1,000`);
  const waitsOnFullCushion = o.cushion.met ? o.goals.find((g) => /after .*safety cushion is full/i.test(g.line)) : undefined;
  if (waitsOnFullCushion) flags.push(`goal waits for a cushion that's already full: "${waitsOnFullCushion.line}"`);

  // Numbers add up: fixed bucket = fixed + debt; savings + Future You + guilt-free = floor(surplus);
  // goal allocations = goal bucket; nothing saved when there's no surplus; the Overview bar matches the buckets.
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
  const bar = o.month.bar.cushion + o.month.bar.goals + o.month.bar.guiltFree;
  if (bar + earmark !== spent) flags.push(`Overview bar ${usd(bar)} + Future You != buckets ${usd(spent)}`);

  const bad = [...badNumbers(p, "plan", []), ...badNumbers(o, "overview", [])];
  if (bad.length) flags.push(`NaN/negative: ${bad.slice(0, 3).join(", ")}${bad.length > 3 ? ` (+${bad.length - 3})` : ""}`);
  return flags;
}

const header = ["Scenario", "Persona", "Step one", "FNB fit", "Month", "Cushion", "Goals", "Path (Now / Next / Later)", "⚠"];
const rows: string[][] = [];
const details: string[] = [];
let flagged = 0;

for (const s of scenarios) {
  const plan = buildPlanSkeleton(s.profile, s.snapshot, s.intake);
  const o = buildOverview(plan, s.profile, s.snapshot);
  const p1Id = [...s.profile.goals].sort((a, b) => a.priority - b.priority)[0]?.id;
  const flags = flagsFor(plan, o, p1Id);
  if (flags.length) {
    flagged++;
    details.push(`- **${s.name}**: ${flags.join("; ")}`);
  }
  rows.push([
    s.name,
    o.persona.label,
    o.nextMove.title,
    o.fnbFit?.name ?? "none",
    monthLine(o),
    o.cushion.progressLine,
    goalLines(o),
    pathLine(o),
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
  "Engine + `buildOverview()` only, no AI. Bar = safety cushion / goals / guilt-free per month.",
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
