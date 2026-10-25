// Ask Sprout checks (#76, docs/ASK_SPROUT.md): chips, follow-ups, explain templates, memory, boundary.
// Runs with AI off so every answer is the deterministic template. Run: npx tsx scripts/check-chat.ts
process.env.AI_DISABLED = "1";

import studentProfile from "../src/data/mocks/profile.student.json";
import familyProfile from "../src/data/mocks/profile.family.json";
import { jordan, maya } from "../src/data/personas";
import { blockChips, followUpChips, starterChips, type BlockChips, type Chip } from "../src/lib/client/chatCopy";
import { buildPlanSkeleton } from "../src/lib/server/engine/plan";
import { answerQuestion } from "../src/lib/ai/chat";
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
const mayaPlanEngine = buildPlanSkeleton(mayaProfile, maya.snapshot, maya.intake);
// SPROUT.md v3 Step one (rule D5), so the D5 explanation is checked whatever engine version is on main.
const mayaPlan: Plan = {
  ...mayaPlanEngine,
  stepOne: { order: 1, stage: "now", kind: "save", title: "Move $20 into your travel fund right now.", detail: "You'll put $69 a month toward it. This starts it.", startMonth: 0 },
};
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
      JSON.stringify(["Why is this my first move?", "How do I close the $140 gap for my travel fund?", "When can I get the SmartSecured card?"]),
    `Starters: ${labels(starters)}`,
  );

  const first = await askChip(starters[0], mayaPlan, mayaProfile, maya.snapshot);
  check(first.route === "explain" && first.answer.includes("$69") && /top goal/.test(first.answer), `Tap 1 (D5): ${first.answer}`);
  let history: ChatTurn[] = [
    { role: "user", text: starters[0].question },
    { role: "sprout", text: first.answer },
  ];
  const afterFirst = followUpChips(starters[0].intent, mayaPlan, mayaProfile, maya.snapshot, history);
  check(afterFirst.length > 0 && afterFirst.length <= 2, `Follow-ups after tap 1: ${labels(afterFirst)}`);

  const gap = await askChip(starters[1], mayaPlan, mayaProfile, maya.snapshot, history);
  check(gap.answer.includes("$140") && gap.answer.includes("$117"), `Gap answer: ${gap.answer}`);
  history = [...history, { role: "user", text: starters[1].question }, { role: "sprout", text: gap.answer }];
  const afterGap = followUpChips(starters[1].intent, mayaPlan, mayaProfile, maya.snapshot, history);
  const lever = afterGap.find((c) => c.label === "What if I move $140 from guilt-free?");
  check(!!lever, `Gap follow-ups: ${labels(afterGap)}`);
  const moved = lever ? await askChip(lever, mayaPlan, mayaProfile, maya.snapshot, history) : null;
  check(!!moved && moved.route === "what_if" && moved.answer.includes("on track") && moved.answer.includes("$117"), `Lever what-if: ${moved?.answer}`);
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
  check(b.month[0]?.label === "How did you split my money?", "Your month: How did you split my money?");
  check(b.cushion.map((c) => c.label).join("|") === "Why 3 months?|How can I fill it faster?", `Cushion: ${labels(b.cushion)}`);
  check(b.goals.travel?.[0]?.label === "What if I move $140 a month from guilt-free to my travel fund?", `P1 lever: ${b.goals.travel?.[0]?.label}`);
  check(b.goals.travel?.[0]?.intent.kind === "what_if" && b.goals.travel?.[0]?.intent.amount === 140, "P1 lever intent: what_if, amount 140");
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
      const ok = !r.aiUsed && r.answer.length > 0 && sentences(r.answer) <= 4 && words(r.answer) <= 70;
      check(ok, `${name} · ${c.intent.kind} · "${c.label}" -> ${r.answer}`);
    }
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
  console.log(failures === 0 ? "\nall checks passed" : `\n${failures} check(s) failed`);
  process.exit(failures === 0 ? 0 : 1);
}

void main();
