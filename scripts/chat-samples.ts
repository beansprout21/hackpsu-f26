// Ask Sprout sample report (#76): every starter, block, and follow-up chip from src/lib/client/chatCopy.ts for
// Maya, Maya with opposite swipes, and Jordan, sent through the same request validation and answerQuestion()
// the /api/chat route uses, once with live AI and once with AI_DISABLED=1. Read-only: writes docs/CHAT_SAMPLES.md
// and prints the flagged rows. Needs ANTHROPIC_API_KEY for the live pass:
//   npx tsx --env-file=.env.local scripts/chat-samples.ts
import { writeFileSync } from "node:fs";
import studentProfile from "../src/data/mocks/profile.student.json";
import familyProfile from "../src/data/mocks/profile.family.json";
import { jordan, maya, mayaOpposite, OPPOSITE_VALUES } from "../src/data/personas";
import { personaFromValues } from "../src/data/personaTaxonomy";
import { blockChips, followUpChips, starterChips, type Chip } from "../src/lib/client/chatCopy";
import { answerQuestion } from "../src/lib/ai/chat";
import { getModel } from "../src/lib/ai/client";
import { buildPlanSkeleton } from "../src/lib/server/engine/plan";
import { ChatRequestSchema, GoalProfileSchema } from "../src/types/schemas";
import type { ChatTurn, FinancialSnapshot, GoalProfile, IntakeAnswers, Plan } from "../src/types";

const OUT = "docs/CHAT_SAMPLES.md";
const MAX_WORDS = 70;
const CONCURRENCY = 4;
const BANNED = /\b(only|just|behind|should have|can['’]t afford|cannot afford|waste)\b/gi;

interface User {
  name: string;
  profile: GoalProfile;
  snapshot: FinancialSnapshot;
  plan: Plan;
}

interface Sample {
  source: string; // where the chip appears, e.g. "starter", "block · cushion", "follow-up · after how_split"
  chip: Chip;
  history: ChatTurn[];
}

interface Row {
  persona: string;
  source: string;
  chip: string;
  question: string;
  answer: string;
  route: string;
  aiUsed: boolean;
  words: number;
  flags: string[];
}

// ---------- users (same fixtures as scripts/check-engine.ts) ----------
const mayaProfile = GoalProfileSchema.parse(studentProfile);
const oppositeDef = personaFromValues(OPPOSITE_VALUES);
const oppositeProfile: GoalProfile = {
  ...mayaProfile,
  persona: { id: oppositeDef.id, label: oppositeDef.label, description: oppositeDef.tagline },
  topValues: OPPOSITE_VALUES,
};
const jordanProfile = GoalProfileSchema.parse(familyProfile);
const user = (name: string, profile: GoalProfile, snapshot: FinancialSnapshot, intake: IntakeAnswers): User => ({
  name,
  profile,
  snapshot,
  plan: buildPlanSkeleton(profile, snapshot, intake),
});
const USERS: User[] = [
  user("Maya", mayaProfile, maya.snapshot, maya.intake),
  user("Maya, opposite swipes", oppositeProfile, mayaOpposite.snapshot, mayaOpposite.intake),
  user("Jordan", jordanProfile, jordan.snapshot, jordan.intake),
];

// ---------- the route's path: validate the request body, then answerQuestion() ----------
async function ask(u: User, chip: Chip, history: ChatTurn[]) {
  const body = ChatRequestSchema.parse({ question: chip.question, profile: u.profile, plan: u.plan, snapshot: u.snapshot, history, intent: chip.intent });
  return answerQuestion(body.question, body.profile, body.plan, { snapshot: body.snapshot, history: body.history, intent: body.intent });
}

// ---------- flags ----------
const numbersIn = (s: string) => (s.match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map((t) => Number(t.replace(/,/g, ""))).filter(Number.isFinite);

// Numbers that appear in the plan or snapshot (as stored, rounded, or floored), plus the chip's own question.
function allowedNumbers(u: User, question: string) {
  const allowed = new Set<number>();
  for (const n of [...numbersIn(JSON.stringify(u.plan)), ...numbersIn(JSON.stringify(u.snapshot)), ...numbersIn(question)]) {
    allowed.add(n);
    allowed.add(Math.round(n));
    allowed.add(Math.floor(n));
  }
  return allowed;
}

function flagsFor(u: User, question: string, answer: string, words: number) {
  const flags: string[] = [];
  if (words > MAX_WORDS) flags.push(`over ${MAX_WORDS} words`);
  const allowed = allowedNumbers(u, question);
  const unknown = [...new Set(numbersIn(answer).filter((n) => !allowed.has(n)))];
  if (unknown.length) flags.push(`numbers not in plan/snapshot: ${unknown.map((n) => n.toLocaleString("en-US")).join(", ")}`);
  const banned = [...new Set((answer.match(BANNED) ?? []).map((w) => w.toLowerCase()))];
  if (banned.length) flags.push(`banned words: ${banned.join(", ")}`);
  return flags;
}

// ---------- chip sets ----------
const dedupe = (samples: Sample[]) => {
  const seen = new Set<string>();
  return samples.filter((s) => (seen.has(s.chip.question) ? false : (seen.add(s.chip.question), true)));
};

function firstChips(u: User): Sample[] {
  const b = blockChips(u.plan, u.profile, u.snapshot);
  const blocks: [string, Chip[] | undefined][] = [
    ["nextMove", b.nextMove],
    ["fnbFit", b.fnbFit],
    ["month", b.month],
    ["cushion", b.cushion],
    ...Object.entries(b.goals).map(([goal, chips]): [string, Chip[] | undefined] => [`goals.${goal}`, chips]),
    ...Object.entries(b.path).map(([stage, chips]): [string, Chip[] | undefined] => [`path.${stage}`, chips]),
  ];
  return [
    ...starterChips(u.plan, u.profile, u.snapshot).map((chip) => ({ source: "starter", chip, history: [] })),
    ...blocks.flatMap(([key, chips]) => (chips ?? []).map((chip) => ({ source: `block · ${key}`, chip, history: [] }))),
  ];
}

// Follow-ups to every first chip, asked with that exchange as history (what the app sends after a tap).
function followUps(u: User, asked: { sample: Sample; answer: string }[], already: Set<string>): Sample[] {
  return asked.flatMap(({ sample, answer }) => {
    const history: ChatTurn[] = [
      { role: "user", text: sample.chip.question },
      { role: "sprout", text: answer.slice(0, 600) },
    ];
    return followUpChips(sample.chip.intent, u.plan, u.profile, u.snapshot, history)
      .filter((chip) => !already.has(chip.question))
      .map((chip) => ({ source: `follow-up · after ${sample.chip.intent.kind}`, chip, history }));
  });
}

async function inBatches<T, R>(items: T[], fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += CONCURRENCY) out.push(...(await Promise.all(items.slice(i, i + CONCURRENCY).map(fn))));
  return out;
}

async function run(u: User): Promise<Row[]> {
  const toRow = async (s: Sample): Promise<{ sample: Sample; row: Row }> => {
    const r = await ask(u, s.chip, s.history);
    const words = r.answer.split(/\s+/).filter(Boolean).length;
    return {
      sample: s,
      row: {
        persona: u.name,
        source: s.source,
        chip: s.chip.label,
        question: s.chip.question,
        answer: r.answer,
        route: r.route,
        aiUsed: r.aiUsed,
        words,
        flags: flagsFor(u, s.chip.question, r.answer, words),
      },
    };
  };
  const first = await inBatches(dedupe(firstChips(u)), toRow);
  const already = new Set(first.map((f) => f.sample.chip.question));
  const next = await inBatches(dedupe(followUps(u, first.map((f) => ({ sample: f.sample, answer: f.row.answer })), already)), toRow);
  return [...first, ...next].map((x) => x.row);
}

async function pass(aiOff: boolean): Promise<Row[]> {
  if (aiOff) process.env.AI_DISABLED = "1";
  else delete process.env.AI_DISABLED;
  const rows: Row[] = [];
  for (const u of USERS) rows.push(...(await run(u)));
  return rows;
}

// ---------- report ----------
const cell = (s: string) => s.replace(/\|/g, "\\|").replace(/\s*\n\s*/g, " ").trim();

function table(rows: Row[]) {
  const head = "| Persona | Chip | Question sent | Answer | Route | aiUsed | Words | Flags |\n|---|---|---|---|---|---|---|---|";
  const body = rows.map(
    (r) =>
      `| ${cell(r.persona)} | ${cell(r.chip)}<br><sub>${cell(r.source)}</sub> | ${cell(r.question)} | ${cell(r.answer)} | ${r.route} | ${r.aiUsed} | ${r.words} | ${r.flags.length ? `**${cell(r.flags.join("; "))}**` : ""} |`,
  );
  return [head, ...body].join("\n");
}

function summary(rows: Row[]) {
  const flagged = rows.filter((r) => r.flags.length).length;
  const ai = rows.filter((r) => r.aiUsed).length;
  return `${rows.length} answers, ${ai} written by AI, ${rows.length - ai} templates, ${flagged} flagged.`;
}

async function main() {
  const hasKey = !!process.env.ANTHROPIC_API_KEY;
  const live = hasKey ? await pass(false) : [];
  const templates = await pass(true);
  const date = new Date().toISOString().slice(0, 10);
  const doc = [
    "# Ask Sprout chat samples",
    "",
    `Generated ${date} by \`scripts/chat-samples.ts\` (#76). Read-only report: every starter, block, and follow-up chip from \`src/lib/client/chatCopy.ts\` for three users, sent through the same request schema and \`answerQuestion()\` that \`/api/chat\` uses.`,
    "",
    "- **Users:** Maya and Jordan with their mock profiles (`src/data/mocks/profile.*.json`), and Maya with opposite swipes (same profile, Family First persona and flipped values, as in `scripts/check-engine.ts`). Plans come from the engine (`buildPlanSkeleton`), so match explanations are the engine's template text, not AI-written plan text.",
    "- **Chips:** starters and block chips are asked with no history; follow-ups are asked with the exchange that produced them as `history`, like the app does after a tap. Each question appears once per user.",
    `- **Flags:** answers over ${MAX_WORDS} words; numbers not found in that user's plan or snapshot (as stored, rounded, or floored) or in the chip's own question; banned voice words (only, just, behind, should have, can't afford, waste). Derived numbers (sums, differences, months-away) are flagged on purpose so they can be reviewed.`,
    "",
    `## Live AI (${hasKey ? `\`${getModel()}\`` : "skipped: ANTHROPIC_API_KEY not set"})`,
    "",
    hasKey ? `${summary(live)}\n\n${table(live)}` : "_Not run._",
    "",
    "## Templates (`AI_DISABLED=1`)",
    "",
    `${summary(templates)}\n\n${table(templates)}`,
    "",
  ].join("\n");
  writeFileSync(OUT, doc);

  const flagged = [...live.map((r) => ({ mode: "live AI", r })), ...templates.map((r) => ({ mode: "template", r }))].filter((x) => x.r.flags.length);
  console.log(`Wrote ${OUT}. Live: ${hasKey ? summary(live) : "skipped"} Templates: ${summary(templates)}`);
  console.log("\n| Mode | Persona | Chip | Answer | Flags |\n|---|---|---|---|---|");
  for (const { mode, r } of flagged) console.log(`| ${mode} | ${cell(r.persona)} | ${cell(r.chip)} | ${cell(r.answer)} | ${cell(r.flags.join("; "))} |`);
}

void main();
