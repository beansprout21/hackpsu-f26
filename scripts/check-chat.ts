// Ask Sprout checks (#76, docs/ASK_SPROUT.md): chips, follow-ups, explain templates, memory, boundary.
// Runs with AI off so every answer is the deterministic template. Run: npx tsx scripts/check-chat.ts
process.env.AI_DISABLED = "1";

import studentProfile from "../src/data/mocks/profile.student.json";
import familyProfile from "../src/data/mocks/profile.family.json";
import { jordan, maya } from "../src/data/personas";
import { blockChips, followUpChips, starterChips, type BlockChips, type Chip } from "../src/lib/client/chatCopy";
import { buildPlanSkeleton } from "../src/lib/server/engine/plan";
import { answerQuestion, explain } from "../src/lib/ai/chat";
import { generatePlan, makeGuard, mergeText } from "../src/lib/ai/plan";
import { gapClaimsConsistent, specificTimes, voiceNormalize, voiceSafe } from "../src/lib/ai/voice";
import { scenarios } from "../src/data/scenarios";
import type { ChatIntent, ChatTurn, FinancialSnapshot, GoalProfile, Plan } from "../src/types";

let failures = 0;
const check = (ok: boolean, msg: string) => {
  if (!ok) failures++;
  console.log(`  ${ok ? "ok  " : "FAIL"} ${msg}`);
};
const words = (s: string) => s.split(/\s+/).filter(Boolean).length;
const sentences = (s: string) => s.split(/(?<=[.!?])\s+/).filter(Boolean).length;
const labels = (chips: Chip[]) => chips.map((c) => `"${c.label}"`).join(" · ");
const allBlockChips = (b: BlockChips) =>
  [b.nextMove, b.fnbFit, b.month, b.cushion, ...Object.values(b.goals), ...Object.values(b.path)].flatMap((c) => c ?? []);

const mayaProfile = studentProfile as GoalProfile;
const mayaPlan: Plan = buildPlanSkeleton(mayaProfile, maya.snapshot, maya.intake);
const ask = (question: string, plan: Plan, profile: GoalProfile, snapshot: FinancialSnapshot, intent?: ChatIntent, history: ChatTurn[] = []) =>
  answerQuestion(question, profile, plan, { snapshot, intent, history });
const askChip = (c: Chip, plan: Plan, profile: GoalProfile, snapshot: FinancialSnapshot, history: ChatTurn[] = []) =>
  ask(c.question, plan, profile, snapshot, c.intent, history);

const FOLLOW_UP_INTENTS: ChatIntent[] = [
  { kind: "why_step_one" },
  { kind: "how_split" },
  { kind: "why_cushion" },
  { kind: "why_product", productId: "student-checking" },
  { kind: "product_fees", productId: "student-checking" },
  { kind: "when_unlock", productId: "smartsecured-card" },
  { kind: "goal_gap", goalId: "travel" },
  { kind: "what_if", amount: 50, goalId: "travel" },
  { kind: "free" },
];

async function mayaDemo() {
  console.log("\n=== Maya demo check (docs/ASK_SPROUT.md)");
  const starters = starterChips(mayaPlan, mayaProfile, maya.snapshot);
  check(
    JSON.stringify(starters.map((c) => c.label)) ===
      JSON.stringify(["Why is this my first move?", "How do I close the $129 gap for my travel fund?", "When can I get the SmartSecured card?"]),
    `Starters: ${labels(starters)}`,
  );

  check(mayaPlan.stepOne.title === "Move $20 into your travel fund right now.", `Engine Step one is rule D5: ${mayaPlan.stepOne.title}`);
  const first = await askChip(starters[0], mayaPlan, mayaProfile, maya.snapshot);
  check(first.route === "explain" && first.answer.includes("$80") && /top goal/.test(first.answer), `Tap 1 (D5): ${first.answer}`);
  let history: ChatTurn[] = [
    { role: "user", text: starters[0].question },
    { role: "sprout", text: first.answer },
  ];
  const afterFirst = followUpChips(starters[0].intent, mayaPlan, mayaProfile, maya.snapshot, history);
  check(afterFirst.length > 0 && afterFirst.length <= 2, `Follow-ups after tap 1: ${labels(afterFirst)}`);

  const gap = await askChip(starters[1], mayaPlan, mayaProfile, maya.snapshot, history);
  check(gap.answer.includes("$129") && gap.answer.includes("$128"), `Gap answer: ${gap.answer}`);
  history = [...history, { role: "user", text: starters[1].question }, { role: "sprout", text: gap.answer }];
  const afterGap = followUpChips(starters[1].intent, mayaPlan, mayaProfile, maya.snapshot, history);
  const lever = afterGap.find((c) => c.label === "What if I move $129 from guilt-free?");
  check(!!lever, `Gap follow-ups: ${labels(afterGap)}`);
  const moved = lever ? await askChip(lever, mayaPlan, mayaProfile, maya.snapshot, history) : null;
  check(!!moved && moved.route === "what_if" && moved.answer.includes("on track") && moved.answer.includes("$128"), `Lever what-if: ${moved?.answer}`);
}

async function memory() {
  console.log("\n=== Memory");
  const whatIf50: ChatTurn[] = [
    { role: "user", text: "What if I save $50 more a month?" },
    { role: "sprout", text: "Saving $50 more a month gives your travel goal $119 a month." },
  ];
  const typed70 = await ask("What about $70 instead?", mayaPlan, mayaProfile, maya.snapshot, undefined, whatIf50);
  check(typed70.route === "what_if" && typed70.answer.includes("$70 more"), `Typed "What about $70 instead?" after a what-if: ${typed70.answer}`);
  const halfChip = followUpChips({ kind: "what_if", amount: 140, goalId: "travel" }, mayaPlan, mayaProfile, maya.snapshot)[0];
  check(halfChip?.label === "What about $70 instead?", `What-if follow-up: "${halfChip?.label}"`);
  const chip70 = halfChip ? await askChip(halfChip, mayaPlan, mayaProfile, maya.snapshot) : null;
  check(!!chip70 && chip70.answer.includes("$70 more") && chip70.answer.includes("travel"), `Chip "What about $70 instead?": ${chip70?.answer}`);
}

function followUpRules() {
  console.log("\n=== Follow-up rules (max 2, never repeat an asked question)");
  for (const intent of FOLLOW_UP_INTENTS) {
    const chips = followUpChips(intent, mayaPlan, mayaProfile, maya.snapshot);
    const asked: ChatTurn[] = chips.map((c) => ({ role: "user", text: c.question }));
    const again = followUpChips(intent, mayaPlan, mayaProfile, maya.snapshot, asked);
    check(chips.length >= 1 && chips.length <= 2 && again.length === 0, `${intent.kind}: ${labels(chips)}`);
  }
}

function blocks() {
  console.log("\n=== Block chips (for #71)");
  const b = blockChips(mayaPlan, mayaProfile, maya.snapshot);
  check(b.nextMove[0]?.label === "Why this first?", "Your next move: Why this first?");
  check(b.fnbFit.map((c) => c.label).join("|") === "Why this account for me?|Any fees I should know?", `FNB fit: ${labels(b.fnbFit)}`);
  check(b.fnbFit[0]?.intent.productId === "student-checking", `FNB fit product = Overview's fit: ${b.fnbFit[0]?.intent.productId}`);
  check(b.path.now?.[0]?.label === "Why Student Checking?", `Path now: ${b.path.now?.[0]?.label}`);
  check(b.month[0]?.label === "How did you split my money?", "Your month: How did you split my money?");
  check(b.cushion.map((c) => c.label).join("|") === "Why 3 months?|How can I fill it faster?", `Cushion: ${labels(b.cushion)}`);
  check(b.goals.travel?.[0]?.label === "What if I move $129 a month from guilt-free to my travel fund?", `P1 lever: ${b.goals.travel?.[0]?.label}`);
  check(b.goals.travel?.[0]?.intent.kind === "what_if" && b.goals.travel?.[0]?.intent.amount === 129, "P1 lever intent: what_if, amount 129");
  check(b.goals.first_home?.[0]?.label === "When does my home fund start growing?", `Other goal: ${b.goals.first_home?.[0]?.label}`);
  check(b.path.later?.[0]?.label === "What unlocks the SmartSecured card?", `Path later: ${b.path.later?.[0]?.label}`);
  check(!!b.path.now?.[0] && !!b.path.next?.[0], `Path now/next: ${b.path.now?.[0]?.label} · ${b.path.next?.[0]?.label}`);
}

async function templates() {
  console.log("\n=== Every intent has a template answer (AI off), within 4 sentences / 70 words");
  const people = [
    ["Maya", mayaPlan, mayaProfile, maya.snapshot],
    ["Jordan", buildPlanSkeleton(familyProfile as GoalProfile, jordan.snapshot, jordan.intake), familyProfile as GoalProfile, jordan.snapshot],
  ] as const;
  for (const [name, plan, profile, snapshot] of people) {
    const chips = [
      ...starterChips(plan, profile, snapshot),
      ...allBlockChips(blockChips(plan, profile, snapshot)),
      ...FOLLOW_UP_INTENTS.flatMap((k) => followUpChips(k, plan, profile, snapshot)),
    ];
    const seen = new Set<string>();
    for (const c of chips) {
      if (seen.has(c.question)) continue;
      seen.add(c.question);
      const r = await askChip(c, plan, profile, snapshot);
      const ok = !r.aiUsed && r.answer.length > 0 && sentences(r.answer) <= 4 && words(r.answer) <= 70 && voiceClean(r.answer);
      check(ok, `${name} · ${c.intent.kind} · "${c.label}" -> ${r.answer}`);
    }
  }
}

// #121 audit: user-facing text never says "emergency fund" and never gives 24+ months (ranges like a CD's
// "3 to 48 months" are product terms and allowed).
function voiceClean(text: string) {
  const longMonths = [...text.matchAll(/\b(\d[\d,]*)\s*months?\b/gi)].some(
    (m) => Number(m[1].replace(/,/g, "")) >= 24 && !/\d\s*(?:to|-|–|and)\s*$/.test(text.slice(Math.max(0, m.index - 12), m.index)),
  );
  return !/emergency fund/i.test(text) && !longMonths && !/10\+\s*years/i.test(text);
}

async function voiceNormalizer() {
  console.log("\n=== Voice normalizer (#121): safety cushion, specific times");
  const cases: [string, string][] = [
    ["Your safety cushion fills in 48 months.", "Your safety cushion fills in about 4 years."],
    ["That takes about 36 months at this pace.", "That takes about 3 years at this pace."],
    ["Pick a term from 3 to 48 months.", "Pick a term from 3 to 48 months."],
    ["You reach it in 18 months.", "You reach it in 18 months."],
    ["Your 120-month plan works.", "Your 10-year plan works."],
    ["It would take 700 months.", "It would take more than 50 years."],
  ];
  for (const [input, expected] of cases) check(specificTimes(input) === expected, `specificTimes: "${input}" -> "${specificTimes(input)}"`);
  check(voiceNormalize("Emergency fund first, then your emergency fund goal.") === "Safety cushion first, then your safety cushion goal.", "voiceNormalize renames emergency fund");
  // Cycle 7: prepositional "behind" is rewritten (meaning-safe); shaming "behind" still fails the guard.
  check(voiceSafe("Free lessons build the know-how behind your goals.") === "Free lessons build the know-how for your goals.", "voiceSafe: \"behind your goals\" -> \"for your goals\"");
  check(voiceSafe("A steady transfer behind both trips.") === "A steady transfer for both trips.", "voiceSafe: \"behind both\" -> \"for both\"");
  check(voiceSafe("You're behind on savings.") === null, "voiceSafe: \"you're behind\" still rejected");
  check(voiceSafe("Your family goal is close behind.") === null, "voiceSafe: \"close behind\" still rejected");

  // With AI off, /api/plan returns the engine's template text through the same normalizer.
  for (const s of scenarios) {
    const skeleton = buildPlanSkeleton(s.profile, s.snapshot, s.intake);
    const { plan } = await generatePlan(skeleton, s.profile);
    const texts = [plan.headline, plan.sproutSays, plan.bankerSummary, ...plan.matches.map((m) => m.explanation), ...plan.steps.filter((x) => x.order !== 1).flatMap((x) => [x.title, x.detail])];
    const bad = texts.filter((t) => !voiceClean(t));
    check(bad.length === 0 && plan.stepOne.title === skeleton.stepOne.title, `${s.id}: fallback plan text clean${bad.length ? ` (${bad.length} field(s) not clean)` : ""}`);
  }
}

async function gapClaims() {
  console.log("\n=== Gap claims match the engine (#121): \"$N a month away\" only for a real off-track gap");
  const travel = mayaPlan.allocation.find((a) => a.goalId === "travel")!;
  const home = mayaPlan.allocation.find((a) => a.goalId === "first_home")!;
  const gap = Math.round(travel.requiredMonthly - travel.monthlyAmount);
  check(gapClaimsConsistent(`Japan is $${gap} a month away.`, mayaPlan), `real travel gap $${gap} accepted`);
  check(!gapClaimsConsistent(`Your home fund is $${home.monthlyAmount} a month away.`, mayaPlan), `home's monthly amount ($${home.monthlyAmount}) as a gap rejected`);
  check(gapClaimsConsistent("Your safety cushion fills in about 14 months.", mayaPlan), "text without a gap claim accepted");
  // Cycle 8: "$N from on track" and "$N short of on track" are gap claims too.
  check(gapClaimsConsistent(`Japan is $${gap} from on track.`, mayaPlan), `"$${gap} from on track" (real gap) accepted`);
  check(!gapClaimsConsistent("Your home is $2 from on track.", mayaPlan), "\"$2 from on track\" (not a gap) rejected");
  check(gapClaimsConsistent("You've saved $400, so you're $750 away from the SmartSecured card.", mayaPlan), "unlock dollars-to-go (\"$750 away\") is not a gap claim");
  // A plan whose AI sproutSays claims a wrong gap keeps the template.
  const ai = { headline: mayaPlan.headline, sproutSays: `Your home fund is $${home.monthlyAmount} a month away.`, explanations: [], steps: [], bankerSummary: mayaPlan.bankerSummary };
  const merged = mergeText(mayaPlan, ai, makeGuard(mayaPlan, mayaPlan));
  check(merged.sproutSays === voiceNormalize(mayaPlan.sproutSays), "wrong gap in AI sproutSays falls back to the template");
}

function explainFacts() {
  console.log("\n=== Explain facts (#121 cycle 3): honest cushion reason, durations as time strings");
  const jordanProfile = familyProfile as GoalProfile;
  const jordanPlan = buildPlanSkeleton(jordanProfile, jordan.snapshot, jordan.intake);
  const mayaWhy = String(explain({ kind: "why_cushion" }, "Why 3 months?", mayaProfile, mayaPlan, maya.snapshot)?.facts.why ?? "");
  const jordanWhy = String(explain({ kind: "why_cushion" }, "Why 3 months?", jordanProfile, jordanPlan, jordan.snapshot)?.facts.why ?? "");
  check(/irregular/i.test(mayaWhy), "Maya (no steady income): irregular-income reason");
  check(!/irregular/i.test(jordanWhy), "Jordan (steady income): no irregular-income reason");
  const kinds: ChatIntent[] = [{ kind: "why_cushion" }, { kind: "goal_gap", goalId: "travel" }, { kind: "when_unlock", productId: "smartsecured-card" }];
  for (const intent of kinds) {
    const facts = JSON.stringify(explain(intent, "?", mayaProfile, mayaPlan, maya.snapshot)?.facts ?? {});
    check(!/monthsToTarget|monthsAway|fullInMonths|newHorizonMonths|"inMonths"/.test(facts), `${intent.kind}: facts carry *Time strings, not raw month counts`);
  }
}

async function boundary() {
  console.log("\n=== Advice boundary");
  const invest = await ask("Should I put money in index funds or a Roth IRA?", mayaPlan, mayaProfile, maya.snapshot);
  check(invest.answer === "When you're ready for that, an FNB advisor can help." && invest.route === "boundary", `Investing: ${invest.answer}`);
}

async function main() {
  await mayaDemo();
  await memory();
  followUpRules();
  blocks();
  await templates();
  await boundary();
  await voiceNormalizer();
  await gapClaims();
  explainFacts();
  console.log(failures === 0 ? "\nall checks passed" : `\n${failures} check(s) failed`);
  process.exit(failures === 0 ? 0 : 1);
}

void main();
