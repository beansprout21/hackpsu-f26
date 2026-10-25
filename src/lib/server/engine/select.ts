// Picks up to 2 matches per goal from the scored catalog. Each product appears once, under its
// highest-priority goal. Second pick prefers a different stage so every goal shows a path:
// if the best is `now`, prefer a `later` unlock; otherwise prefer a `now` start.
import type { GoalId, Product, ProfiledGoal, ScoreBreakdown, Stage } from "@/types";
import { getCatalog } from "@/lib/server/catalog";
import type { EngineContext } from "./context";
import { scoreProduct, totalScore } from "./score";
import { stageFor, type StageResult } from "./stage";

export interface Candidate {
  product: Product;
  goalId: GoalId;
  breakdown: ScoreBreakdown;
  score: number;
  staging: StageResult;
}

export function candidateFor(
  product: Product,
  goal: Pick<ProfiledGoal, "id" | "priority">,
  ctx: EngineContext,
): Candidate | null {
  // #118: mortgages and homebuyer programs only ever serve the first_home goal.
  if (product.category === "mortgage" && goal.id !== "first_home") return null;
  const breakdown = scoreProduct(product, goal, ctx);
  const staging = stageFor(product, ctx);
  if (!breakdown || !staging) return null;
  return { product, goalId: goal.id, breakdown, score: totalScore(breakdown), staging };
}

function pickSecond(rest: Candidate[], first: Candidate): Candidate | undefined {
  const preferred: Stage = first.staging.stage === "now" ? "later" : "now";
  return (
    rest.find((c) => c.staging.stage === preferred) ??
    rest.find((c) => c.staging.stage !== first.staging.stage) ??
    rest[0]
  );
}

export function selectMatches(ctx: EngineContext): Candidate[] {
  const catalog = getCatalog();
  const used = new Set<string>();
  const picked: Candidate[] = [];
  const goals = [...ctx.profile.goals].sort((a, b) => a.priority - b.priority);

  for (const goal of goals) {
    const ranked = catalog
      .filter((p) => !used.has(p.id))
      .map((p) => candidateFor(p, goal, ctx))
      .filter((c): c is Candidate => c !== null)
      .sort((a, b) => b.score - a.score); // stable: ties keep catalog order
    const first = ranked[0];
    if (!first) continue;
    const second = pickSecond(ranked.slice(1), first);
    for (const c of [first, second]) {
      if (c) {
        picked.push(c);
        used.add(c.product.id);
      }
    }
  }
  return picked;
}
