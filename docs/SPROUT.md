# Sprout's Brain

Sprout is the app and its advisor. The **engine** (deterministic code, issue #3) decides numbers, stages, and Step one. The **AI** (issues #4, #5) explains them in Sprout's voice. The AI never changes an amount, a stage, a trigger, or the Step one choice.

Part 1 (this version): engine rulebook, approved by Ben Sat 3:50 PM.
Part 2 (next): voice guide, persona copy, system prompts, golden example.

## Guiding theme: optimism that leads to action

Sprout's job is to get a student to **start**. Every rule below is tuned so the first screen feels achievable, not judgmental.
- Always lead with what the user CAN do now, never with what they lack.
- A small surplus is framed as a start ("$58 a month builds a $650 cushion by summer"), never as a shortfall.
- "Not yet" is framed as "unlocks when", with the path to unlock it.
- Guilt-free spending is protected on purpose: plans that ban fun get abandoned.

## Rule set A: effective income and surplus

- `effectiveMonthlyIncome = Σ monthly×1 + Σ per_semester/4 + Σ one_time/9` (one-time money is spread over the 9-month academic year).
- `monthlySurplus = effectiveMonthlyIncome − monthlyFixedCosts − monthlyDebtPayments`.
- Return the breakdown so the UI can show the math.
- Maya check: 200 + 1500/4 + 2400/9 = 841.67; − 650 = **191.67/month**.

## Rule set B: spending plan (4 buckets)

| Bucket | Rule |
|---|---|
| `fixed_costs` | Actual `monthlyFixedCosts` (+ debt payments shown in the note) |
| `emergency_fund` | 30% of surplus until the cushion target is met, then 0% (its share moves to `goal_savings`) |
| `goal_savings` | 40% of surplus (70% once the cushion is met), split across goals by priority: P1 50%, P2 30%, P3 20%, renormalized to the goals present |
| `guilt_free` | 30% of surplus, always |

- **Cushion targets:** starter = 1 × (fixed + debt). Full = 3 × (fixed + debt). Students aim for the starter first; young families aim for full.
- Percentages are of effective monthly income in the output; amounts are rounded to whole dollars; buckets never exceed income.
- **Surplus ≤ 0:** emergency, goal, and guilt-free amounts are 0; the plan contains only `budget` and `habit` steps plus $0 products. Sprout frames this as "first we find your breathing room".
- Maya check: emergency ≈ $58, goals ≈ $77 (travel 50%, credit 30%, home 20% of that), guilt-free ≈ $58.

## Rule set C: Step one (first match wins; must be doable this week)

1. `isFnbCustomer === false` → **Open FNB Student Checking** (students) or the best no/low-fee checking for the life stage. $0, no minimum.
2. Customer without the starter cushion → **Set up an automatic transfer on the day money arrives** (habit).
3. Surplus ≤ 0 → **Track one month of spending** (budget).
4. Otherwise → the highest-scoring `now` match.

## Rule set D: staging

- `now`: eligible and affordable today AND foundational (everyday banking, starter cushion, $0 tools, education).
- `next`: eligible today but should follow a `now` item (e.g. a goal CD after checking is open).
- `later`: fails eligibility or affordability today but passes under a reachable condition. MUST carry `unlockTrigger` and plain `unlockCondition`.
- Dropped: fails with no reachable condition.

**Student unlock triggers:**

| Product type | Trigger |
|---|---|
| Secured card (credit building) | `savings_threshold` = starter cushion + minimum deposit, OR `life_event: first_paycheck` |
| Products needing steady income (most loans, unsecured cards) | `life_event: first_paycheck` or `internship` |
| Mortgages and homebuyer programs | `life_event: full_time_job` AND full cushion (show the money threshold as the trigger, the job in the condition text) |

**Maya's expected staging (golden test):**

| Product | Stage | Unlock |
|---|---|---|
| Student Checking | now (Step one) | — |
| Savers Goal CD ($100 open, $25/mo, 12 months) for Japan | next | after checking is open |
| SmartSecured card ($500 to $2,000 deposit) | later | savings ≥ cushion + $500, or first paycheck |
| HomeOne / Home Ownership Program | later | full-time job + 3 months saved |
| Learning Center (free modules) | now | — |

**Not yet (always for Maya):** mortgage pre-approval: "after a steady income and 3 months saved".

## Rule set E: advice boundary (engine + AI)

Covered: budgeting, saving, credit building, FNB products and programs. Not covered: investing, taxes, insurance products. For those Sprout says an FNB advisor can help when the user is ready, and stops.

## Catalog note

Use `src/data/catalog.json` built from `docs/research-fnb-catalog.md`. A larger, more complete FNB catalog (v2) is being researched; it will arrive as a data-only PR to `catalog.json` and must not require engine changes.
