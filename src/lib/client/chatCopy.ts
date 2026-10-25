// Ask Sprout chips (docs/ASK_SPROUT.md, #76). Ben owns every chip's text: change wording here only.
// Pure functions of the user's plan, so the same chips can be built on the server and in checks.
// Fund names, the FNB fit, the path and the lever text come from the Overview's own model (#67), so a
// block's chip always names what that block shows.
import rawCatalog from "@/data/catalog.json";
import type { ChatIntent, ChatTurn, FinancialSnapshot, GapLever, GoalId, GoalProfile, Match, Plan, Product, Stage } from "@/types";
import { buildOverview, statedGap } from "./overview";
import { FUND_NAME, leverMoreTime, leverSmallerTarget, leverTurnUpDial } from "./planCopy";

export interface Chip {
  label: string; // what the chip shows
  question: string; // what it sends (same text today; kept apart so a chip can be shorter later)
  intent: ChatIntent;
}

export interface BlockChips {
  nextMove: Chip[];
  fnbFit: Chip[];
  month: Chip[];
  cushion: Chip[];
  goals: Partial<Record<GoalId, Chip[]>>; // every goal line on the Overview except the safety cushion
  path: Partial<Record<Stage, Chip[]>>;
}

const MAX_STARTERS = 3;
const MAX_FOLLOW_UPS = 2;
const NUDGE = 50; // the "+$50" in the spec's what-if chips

const catalog = new Map((rawCatalog as unknown as Product[]).map((p) => [p.id, p]));

export const fundName = (goalId: GoalId) => FUND_NAME[goalId];

// "FNB SmartSecured Credit Card" -> "SmartSecured card", "Credit Center (credit score and report)" -> "Credit Center".
export function productShortName(productId: string) {
  const name = catalog.get(productId)?.name ?? productId.replace(/-/g, " ");
  return name
    .replace(/^FNB\s+/, "")
    .replace(/\s*\(.*\)\s*$/, "")
    .replace(/\bCredit Card$/, "card");
}

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const chip = (question: string, intent: ChatIntent): Chip => ({ label: question, question, intent });

// ---------- plan lookups (same rules as docs/DASHBOARD.md) ----------
export function p1GoalId(profile: GoalProfile): GoalId | undefined {
  return [...profile.goals].sort((a, b) => a.priority - b.priority)[0]?.id;
}

// The FNB fit under Step one, exactly as the Overview picks it; without a snapshot, the top-scoring `now` match.
export function fnbFitMatch(plan: Plan, profile?: GoalProfile, snapshot?: FinancialSnapshot): Match | undefined {
  const id = profile && snapshot ? buildOverview(plan, profile, snapshot).fnbFit?.productId : undefined;
  return (
    (id && plan.matches.find((m) => m.productId === id)) ||
    plan.matches.filter((m) => m.stage === "now").sort((a, b) => b.score - a.score)[0]
  );
}

// "Your path" (DASHBOARD.md): Now = the FNB fit, Next and Later = the first match of each stage.
export function pathMatches(plan: Plan, profile?: GoalProfile, snapshot?: FinancialSnapshot): Partial<Record<Stage, Match>> {
  return {
    now: fnbFitMatch(plan, profile, snapshot),
    next: plan.matches.find((m) => m.stage === "next"),
    later: plan.matches.find((m) => m.stage === "later"),
  };
}

const laterMatchFor = (plan: Plan, goalId: GoalId) =>
  plan.matches.find((m) => m.stage === "later" && m.goalId === goalId && m.unlockCondition);

function cushionFull(plan: Plan, snapshot?: FinancialSnapshot) {
  if (snapshot) return snapshot.savingsBalance >= plan.cushionTarget;
  return plan.cushionFillsInMonths === null;
}

// ---------- chip families ----------
const whyStepOne = (question: string) => chip(question, { kind: "why_step_one" });
const howSplit = () => chip("How did you split my money?", { kind: "how_split" });
const saveMore = () => chip("What if I save $50 more a month?", { kind: "what_if", amount: NUDGE });
const fillFaster = () => chip("How can I fill it faster?", { kind: "what_if", amount: NUDGE, goalId: "emergency_fund" });
const whyProduct = (question: string, productId: string) => chip(question, { kind: "why_product", productId });
const productFees = (productId: string) => chip("Any fees I should know?", { kind: "product_fees", productId });

const MORE_TIME_MAX_MONTHS = 60; // DASHBOARD.md v3.1: more_time is offered only up to 5 years

function leverChipFor(goalId: GoalId, lever: GapLever): Chip {
  switch (lever.kind) {
    case "turn_up_dial":
      return chip(leverTurnUpDial(goalId, lever.moveFromGuiltFree).askSprout, { kind: "what_if", amount: lever.moveFromGuiltFree, goalId });
    case "more_time":
      return chip(leverMoreTime(goalId, lever.newHorizonMonths).askSprout, { kind: "goal_gap", goalId });
    case "smaller_target":
      return chip(leverSmallerTarget(goalId, lever.reachableAmount).askSprout, { kind: "goal_gap", goalId });
  }
}

// The P1 goal's lever chip: the Overview's own lever text when there's a snapshot (so the chip always
// matches the button the user sees), else the DASHBOARD.md v3.1 order applied here.
function leverChip(plan: Plan, profile: GoalProfile, goalId: GoalId, snapshot?: FinancialSnapshot): Chip | undefined {
  const levers = plan.allocation.find((a) => a.goalId === goalId)?.levers ?? [];
  if (snapshot) {
    const askSprout = buildOverview(plan, profile, snapshot).goals.find((g) => g.goalId === goalId)?.lever?.askSprout;
    if (!askSprout) return undefined;
    return levers.map((l) => leverChipFor(goalId, l)).find((c) => c.question === askSprout) ?? chip(askSprout, { kind: "free" });
  }
  const lever =
    levers.find((l) => l.kind === "turn_up_dial") ??
    levers.find((l) => l.kind === "more_time" && l.newHorizonMonths <= MORE_TIME_MAX_MONTHS) ??
    levers.find((l) => l.kind === "smaller_target");
  return lever && leverChipFor(goalId, lever);
}

export function starterChips(plan: Plan, profile: GoalProfile, snapshot?: FinancialSnapshot, history: ChatTurn[] = []): Chip[] {
  const chips: Chip[] = [whyStepOne("Why is this my first move?")];

  const p1 = p1GoalId(profile);
  const alloc = p1 ? plan.allocation.find((a) => a.goalId === p1) : undefined;
  if (p1 && alloc) {
    // DASHBOARD.md v2.1 (#159): name the gap only when guilt-free money can close it.
    const gap = statedGap(alloc);
    chips.push(
      gap !== null
        ? chip(`How do I close the ${usd(gap)} gap for my ${fundName(p1)}?`, { kind: "goal_gap", goalId: p1 })
        : alloc.onTrack
          ? chip(`Can I reach my ${fundName(p1)} sooner?`, { kind: "what_if", amount: NUDGE, goalId: p1 })
          : chip(`How can I reach my ${fundName(p1)} sooner?`, { kind: "goal_gap", goalId: p1 }),
    );
  }

  const later = pathMatches(plan, profile, snapshot).later;
  chips.push(
    later
      ? chip(`When can I get the ${productShortName(later.productId)}?`, { kind: "when_unlock", productId: later.productId })
      : saveMore(),
  );
  return withoutAsked(chips, history).slice(0, MAX_STARTERS);
}

export function blockChips(plan: Plan, profile: GoalProfile, snapshot?: FinancialSnapshot, history: ChatTurn[] = []): BlockChips {
  void history; // block chips stay put; asking one again is the user's call
  const fit = fnbFitMatch(plan, profile, snapshot);
  const path = pathMatches(plan, profile, snapshot);
  const p1 = p1GoalId(profile);

  const goals: Partial<Record<GoalId, Chip[]>> = {};
  for (const a of plan.allocation) {
    if (a.goalId === "emergency_fund") continue; // the cushion block covers it
    if (a.goalId === p1) {
      const lever = leverChip(plan, profile, a.goalId, snapshot);
      goals[a.goalId] = lever ? [lever] : [];
      continue;
    }
    const later = laterMatchFor(plan, a.goalId);
    goals[a.goalId] = [
      chip(
        `When does my ${fundName(a.goalId)} start growing?`,
        later ? { kind: "when_unlock", goalId: a.goalId, productId: later.productId } : { kind: "goal_gap", goalId: a.goalId },
      ),
    ];
  }

  return {
    nextMove: [whyStepOne("Why this first?")],
    fnbFit: fit ? [whyProduct("Why this account for me?", fit.productId), productFees(fit.productId)] : [],
    month: [howSplit()],
    cushion: cushionFull(plan, snapshot) ? [chip("Why 3 months?", { kind: "why_cushion" })] : [chip("Why 3 months?", { kind: "why_cushion" }), fillFaster()],
    goals,
    path: {
      now: path.now ? [whyProduct(`Why ${productShortName(path.now.productId)}?`, path.now.productId)] : [],
      next: path.next ? [whyProduct(`Why ${productShortName(path.next.productId)}?`, path.next.productId)] : [],
      later: path.later
        ? [chip(`What unlocks the ${productShortName(path.later.productId)}?`, { kind: "when_unlock", productId: path.later.productId })]
        : [],
    },
  };
}

// Up to 2 chips after an answer, by the intent that answer came from. Never repeats an asked question.
export function followUpChips(
  last: ChatIntent,
  plan: Plan,
  profile: GoalProfile,
  snapshot?: FinancialSnapshot,
  history: ChatTurn[] = [],
): Chip[] {
  const p1 = p1GoalId(profile);
  const chips: (Chip | undefined)[] = [];
  switch (last.kind) {
    case "why_step_one": {
      const after = fnbFitMatch(plan, profile, snapshot) ?? pathMatches(plan).next;
      chips.push(after && whyProduct("What comes after that?", after.productId), howSplit());
      break;
    }
    case "how_split":
      chips.push(
        chip("Why 3 months for my cushion?", { kind: "why_cushion" }),
        chip("What if I spend $50 less on fun?", { kind: "what_if", amount: NUDGE, ...(p1 && { goalId: p1 }) }),
      );
      break;
    case "why_cushion":
      chips.push(cushionFull(plan, snapshot) ? undefined : fillFaster(), chip("Does the money I already have count?", { kind: "why_cushion" }));
      break;
    case "why_product":
    case "product_fees": {
      const id = last.productId;
      const other = id ? (last.kind === "why_product" ? productFees(id) : whyProduct("Why this account for me?", id)) : undefined;
      chips.push(other, whyStepOne("What should I do first?"));
      break;
    }
    case "when_unlock": {
      const match = plan.matches.find((m) => m.stage === "later" && (m.productId === last.productId || (!last.productId && m.goalId === last.goalId)));
      // Savings thresholds move faster with more saved; other unlocks with more toward that goal.
      const goalId = match?.unlockTrigger?.kind === "savings_threshold" ? "emergency_fund" : (match?.goalId ?? last.goalId);
      chips.push(
        chip("How do I get there faster?", { kind: "what_if", amount: NUDGE, ...(goalId && { goalId }) }),
        whyStepOne("What can I do now instead?"),
      );
      break;
    }
    case "goal_gap": {
      const goalId = last.goalId ?? p1;
      const levers = plan.allocation.find((a) => a.goalId === goalId)?.levers ?? [];
      const dial = levers.find((l) => l.kind === "turn_up_dial");
      chips.push(
        dial && goalId && chip(`What if I move ${usd(dial.moveFromGuiltFree)} from guilt-free?`, { kind: "what_if", amount: dial.moveFromGuiltFree, goalId }),
        levers.some((l) => l.kind === "more_time") && goalId ? chip("What if I give it more time?", { kind: "goal_gap", goalId }) : undefined,
      );
      break;
    }
    case "what_if": {
      const half = Math.round(Math.abs(last.amount ?? NUDGE) / 2);
      chips.push(
        half >= 1 ? chip(`What about ${usd(half)} instead?`, { kind: "what_if", amount: half, ...(last.goalId && { goalId: last.goalId }) }) : undefined,
        chip("Where does that money come from?", { kind: "how_split" }),
      );
      break;
    }
    case "free":
      chips.push(whyStepOne("Why is this my first move?"), saveMore());
      break;
  }
  return withoutAsked(chips.filter((c): c is Chip => !!c), history).slice(0, MAX_FOLLOW_UPS);
}

// ---------- helpers ----------
const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

function withoutAsked(chips: Chip[], history: ChatTurn[]) {
  const asked = new Set(history.filter((t) => t.role === "user").map((t) => norm(t.text)));
  const seen = new Set<string>();
  return chips.filter((c) => {
    const key = norm(c.question);
    if (asked.has(key) || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const FOLLOW_UP_SEEDS: ChatIntent["kind"][] = ["why_step_one", "how_split", "why_cushion", "free"];

// The chip a typed or restored question came from, if any (so a reload keeps the right follow-ups).
export function chipForQuestion(question: string, plan: Plan, profile: GoalProfile, snapshot?: FinancialSnapshot): Chip | undefined {
  const key = norm(question);
  const blocks = blockChips(plan, profile, snapshot);
  const candidates: Chip[] = [
    ...starterChips(plan, profile, snapshot),
    ...[blocks.nextMove, blocks.fnbFit, blocks.month, blocks.cushion, ...Object.values(blocks.goals), ...Object.values(blocks.path)].flatMap((c) => c ?? []),
    ...FOLLOW_UP_SEEDS.flatMap((kind) => followUpChips({ kind }, plan, profile, snapshot)),
    ...plan.matches.flatMap((m) => [
      ...followUpChips({ kind: "why_product", productId: m.productId }, plan, profile, snapshot),
      ...followUpChips({ kind: "product_fees", productId: m.productId }, plan, profile, snapshot),
    ]),
    ...plan.allocation.flatMap((a) => followUpChips({ kind: "goal_gap", goalId: a.goalId }, plan, profile, snapshot)),
  ];
  return candidates.find((c) => norm(c.question) === key);
}
