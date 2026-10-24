// Restraint rules (spec rule 3): what Sprout deliberately holds back, and when to revisit.
import type { NotYet } from "@/types";
import { usd, type EngineContext } from "./context";
import { isMortgageLike } from "./stage";
import type { Candidate } from "./select";

export function buildNotYet(ctx: EngineContext, matches: Candidate[]): NotYet[] {
  const { snapshot, math, profile } = ctx;
  const goalIds = new Set(profile.goals.map((g) => g.id));
  const lacksFullCushion = snapshot.savingsBalance < math.fullCushion;
  const out: NotYet[] = [];

  if (math.monthlySurplus <= 0) {
    out.push({
      reason: "No new products that cost money yet. Right now your costs use up your income, so first we find some breathing room.",
      revisitWhen: "after a month of tracking spending",
    });
  }

  if (goalIds.has("first_home") && (lacksFullCushion || !snapshot.hasSteadyIncome)) {
    const mortgage = matches.find((m) => isMortgageLike(m.product));
    out.push({
      goalId: "first_home",
      ...(mortgage ? { productId: mortgage.product.id } : {}),
      reason: snapshot.hasSteadyIncome
        ? `Not a mortgage pre-approval yet. Your savings cover less than 3 months of costs, and buying now would leave no cushion.`
        : "Not a mortgage pre-approval yet. Lenders look for steady income, and a 3-month cushion keeps a new home from becoming a risk.",
      revisitWhen: snapshot.hasSteadyIncome
        ? `after ${usd(math.fullCushion)} (3 months of costs) is saved`
        : "after a steady income and 3 months saved",
    });
  }

  if (goalIds.has("credit_building") && (snapshot.creditBand === "building" || snapshot.creditBand === "unsure")) {
    out.push({
      goalId: "credit_building",
      reason: "Not an unsecured credit card yet. A secured card builds your history first, without a high limit or a likely denial.",
      revisitWhen: "after 6 to 12 months of on-time payments",
    });
  }

  if (lacksFullCushion && out.length === 0) {
    out.push({
      reason: `Big commitments like loans wait until your 3-month cushion (${usd(math.fullCushion)}) is in place.`,
      revisitWhen: `after ${usd(math.fullCushion)} is saved`,
    });
  }
  return out;
}
