// Every Overview string (docs/DASHBOARD.md "Copy rules"), in one place so Ben can edit text here.
// Components render these via buildOverview() (src/lib/client/overview.ts); they never write plan text.
// Numbers come from the engine (docs/SPROUT.md v3.2); these functions only format them.
// Durations always go through src/lib/client/time.ts (DASHBOARD.md v2: specific months/years, never "10+").
import type { GoalId } from "@/types";
import { aboutTime, timeSpan } from "./time";

export const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
export const months = timeSpan;

// Ask Sprout starter questions (DASHBOARD.md).
export const ASK_SPROUT_STARTERS = ["Why this first?", "What if I save $50 more a month?", "When can I get a credit card?"] as const;
export const WHY_THIS_FIRST = ASK_SPROUT_STARTERS[0];

// Rule D2 (SPROUT.md v3): the only Step one with a link.
export const CREDIT_REPORT_URL = "https://www.annualcreditreport.com";
export const CREDIT_REPORT_LINK_LABEL = "Open annualcreditreport.com";

// Overview block titles and controls (DASHBOARD.md block order). Components render these as-is.
export const BLOCK_TITLES = {
  steps: "Your step-by-step plan", // v2: replaces "Your next move" + "Your path"
  nextMove: "Your next move",
  month: "Your month",
  cushion: "Your safety cushion",
  goals: "Your goals",
  path: "Your path",
  fnb: "Take it to FNB",
} as const;
export const DONE_LABEL = "Done";
export const DONE_MESSAGE = "Nice start";
export const FNB_FIT_LABEL = "Your FNB fit";
export const DETAILS_LABEL = "Details";
export const OPEN_ROADMAP_LABEL = "Open roadmap";
export const MILESTONE_LABEL = "1 month covered";
export const MONTH_BAR_LABELS = { fixed: "Fixed costs", cushion: "Safety cushion", goals: "Goals", guiltFree: "Guilt-free" } as const;
// SPROUT.md v3.3 (#107): the goals segment's label when the user chose only habits.
export const MONTH_BAR_SAVINGS_LABEL = "Savings";
export const PATH_STAGE_LABELS = { now: "Now", next: "Next", later: "Later" } as const;

// Fund names, lowercase for use mid-sentence ("my travel fund"); fund() capitalizes for line starts.
export const FUND_NAME: Record<GoalId, string> = {
  travel: "travel fund",
  first_home: "home fund",
  education: "education fund",
  small_business: "business fund",
  family: "family fund",
  emergency_fund: "safety cushion",
  credit_building: "credit building",
  everyday_banking: "everyday banking",
};
export const fund = (id: GoalId) => FUND_NAME[id].charAt(0).toUpperCase() + FUND_NAME[id].slice(1);

// 1. Your next move: the FNB fit under Step one.
const ACCOUNT_NOUN: Record<string, string> = { checking: "checking account", savings: "savings account", cd: "CD", credit_card: "credit card" };
export const fnbFitLine = (name: string, category: string, feeLine: string) =>
  `No ${ACCOUNT_NOUN[category] ?? "account"} yet? ${name} opens online in minutes, ${lowerFirst(feeLine)}.`;
export const HUB_BRANCH = "At Penn State? The FNB branch in the HUB is at 288 Pollock Road.";

// 1. Your step-by-step plan (v2): Step one, the FNB account that holds it, the next product, what unlocks later.
export const SEE_AT_FNB_LABEL = "See it at FNB";
export const stepOpenToHold = (name: string) => `Open ${name} to hold it`;
export const stepUseFor = (name: string, id: GoalId) => `Use ${name} for your ${FUND_NAME[id]}`;
export const stepOpenFor = (name: string, id: GoalId) => `Open ${name} for your ${FUND_NAME[id]}`;
export const stepUnlock = (name: string) => `Unlock ${name}`;
export const WHY_THIS_ACCOUNT = "Why this account?";
export const whyThisProduct = (shortName: string) => `Why ${shortName}?`;
// Habit steps (SPROUT.md v3.2): habits cost time, not money. Same text as rule D rows 2 and 3.
export const HABIT_STEP: Partial<Record<GoalId, { title: string; detail: string; url?: string }>> = {
  credit_building: {
    title: "Check your free credit report",
    detail: "5 minutes at annualcreditreport.com. Free, and it doesn't hurt your score.",
    url: CREDIT_REPORT_URL,
  },
  everyday_banking: { title: "Turn on low-balance alerts", detail: "No surprise fees, ever." },
};

// 2. Your month (v2: shows fixed costs).
export const monthSentence = (income: number, fixed: number, surplus: number) =>
  surplus > 0
    ? `Your ${usd(income)} a month: ${usd(fixed)} for fixed costs, ${usd(surplus)} to work with.`
    : "Right now your costs use everything coming in. Your next move finds some breathing room.";

// 3. Your safety cushion.
export const cushionTitle = (target: number) => `Your safety cushion: ${usd(target)}`;
export const CUSHION_REASON = "If money stops coming in for up to 3 months, your rent and bills are still covered.";
export const CUSHION_MET = "Your safety cushion is full. Every savings dollar now goes to your goals.";
export const CUSHION_NOTE = "Already have savings set aside? It counts.";
export const cushionProgress = (saved: number, target: number, milestoneInMonths: number | null, fullInMonths: number | null) =>
  [
    `${usd(saved)} of ${usd(target)}`,
    milestoneInMonths !== null ? `1 month covered in ${months(milestoneInMonths)}` : null,
    fullInMonths !== null ? `full in ${months(fullInMonths)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

// 4. Your goals (the emergency_fund goal is the cushion block, not a line here).
export const goalOnTrack = (id: GoalId, monthly: number) => `${fund(id)} is on track: ${usd(monthly)} a month gets you there.`;
export const goalGap = (id: GoalId, gap: number) => `${fund(id)} is ${usd(gap)} a month away.`;
export const goalOnPath = (id: GoalId, monthsAtPace: number) => `${fund(id)}: on your path, ${aboutTime(monthsAtPace)} at your pace.`;
// v3.1: a non-P1 goal with money going in says so; the pace part only when it's within 2 x horizon.
export const goalGoingIn = (id: GoalId, monthly: number, monthsAtPace: number | null) =>
  `${fund(id)}: ${usd(monthly)} a month going in${monthsAtPace !== null ? `, ${aboutTime(monthsAtPace)} at your pace` : ""}.`;
// v3.2 habits: they cost time, not money, so no dollar amounts.
export const HABIT_LINE: Partial<Record<GoalId, string>> = {
  credit_building: "Credit building: costs time, not money. Start by checking your free credit report.",
  everyday_banking: "Everyday banking: costs time, not money. Start by turning on low-balance alerts.",
};
export const goalLater = (id: GoalId, unlock: string) => `${fund(id)}: starts growing after ${unlock}.`;
export const DEFAULT_UNLOCK = "your safety cushion is full";
// v3.1: the $0-going-in unlock when the cushion is already full.
export const TOP_GOAL_UNLOCK = "your top goal is on track";

export const leverTurnUpDial = (id: GoalId, move: number) => ({
  label: `See what moving ${usd(move)} from guilt-free does`,
  askSprout: `What if I move ${usd(move)} a month from guilt-free to my ${FUND_NAME[id]}?`,
});
export const leverMoreTime = (id: GoalId, newHorizonMonths: number) => ({
  label: "See it with more time",
  askSprout: `What if I give my ${FUND_NAME[id]} ${months(newHorizonMonths)}?`,
});
export const leverSmallerTarget = (id: GoalId, reachableAmount: number) => ({
  label: "See a smaller target",
  askSprout: `What if my ${FUND_NAME[id]} target were ${usd(reachableAmount)}?`,
});
// v3.1: more_time is shown only up to this many months.
export const MORE_TIME_MAX_MONTHS = 60;
// v3.1: last resort when no money lever fits and the plan has the Big Win step.
export const LEVER_BIG_WIN = {
  label: "Review your biggest fixed cost",
  askSprout: "How can I lower my biggest fixed cost?",
};

// 5. Your path.
export const pathUnlock = (condition: string) => `Unlocks when ${withoutWhen(condition)}.`;

// Engine unlock conditions read "When your savings reach $1,150 ..."; the templates supply their own lead-in.
export function withoutWhen(condition: string): string {
  return lowerFirst(condition.trim().replace(/^when\s+/i, "").replace(/[.\s]+$/, ""));
}
function lowerFirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}
