// Every Overview string (docs/DASHBOARD.md "Copy rules"), in one place so Ben can edit text here.
// Components render these via buildOverview() (src/lib/client/overview.ts); they never write plan text.
// Numbers come from the engine (docs/SPROUT.md v3); these functions only format them.
import type { GoalId } from "@/types";

export const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
export const months = (n: number) => (n === 1 ? "1 month" : `${n} months`);

// Ask Sprout starter questions (DASHBOARD.md).
export const ASK_SPROUT_STARTERS = ["Why this first?", "What if I save $50 more a month?", "When can I get a credit card?"] as const;
export const WHY_THIS_FIRST = ASK_SPROUT_STARTERS[0];

// Rule D2 (SPROUT.md v3): the only Step one with a link.
export const CREDIT_REPORT_URL = "https://www.annualcreditreport.com";

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

// 2. Your month.
export const monthSentence = (surplus: number) =>
  surplus > 0
    ? `You have ${usd(surplus)} a month to work with.`
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
export const goalOnPath = (id: GoalId, monthsAtPace: number) => `${fund(id)}: on your path, about ${months(monthsAtPace)} at your pace.`;
// v3.1: a non-P1 goal with money going in says so; the pace part only when it's within 2 x horizon.
export const goalGoingIn = (id: GoalId, monthly: number, monthsAtPace: number | null) =>
  `${fund(id)}: ${usd(monthly)} a month going in${monthsAtPace !== null ? `, about ${months(monthsAtPace)} at your pace` : ""}.`;
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
