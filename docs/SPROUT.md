# Sprout's Brain (v2)

Sprout is the app and its advisor. The **engine** (deterministic code) decides numbers, stages, levers, and Step one. The **AI** explains them in Sprout's voice. The AI never changes an amount, a stage, a trigger, a lever, or the Step one choice.

Approved by Ben, Sat 4:39 PM. v1 (3:50 PM) is superseded.

## Method credit

Sprout's planning logic uses as its **starting guideline** (not a copy; we tune every number for FNB and students) Ramit Sethi's *I Will Teach You to Be Rich* (2nd ed., 2019): define a Rich Life first, fund it with a conscious spending plan (fixed costs, savings, investing, guilt-free spending), turn up the "money dials" you love, automate, and focus on big wins. Adapted for students with irregular income and limited to budgeting, saving, credit building, and FNB products. Never call our plan "the Conscious Spending Plan" and never use the book's text or branding in the app. Research and sources: `docs/research/iwt-method.md`.

Reference ranges from the method (share of take-home pay): fixed costs about 50 to 60%, investing about 10%, savings 5 to 10%, guilt-free 20 to 35%.

## Guiding theme: optimism that leads to action

- Lead with what the user CAN do now, never with what they lack.
- Always a number and a date.
- "Not yet" is framed as "unlocks when", with the path.
- Guilt-free money is protected on purpose: it funds what the user loves (their top dial).

## Rule set A: effective income and surplus

- `effectiveMonthlyIncome = Σ monthly×1 + Σ per_semester/4 + Σ one_time/9`
- `fixedShare = (monthlyFixedCosts + monthlyDebtPayments) / effectiveMonthlyIncome`
- `monthlySurplus = effectiveMonthlyIncome − monthlyFixedCosts − monthlyDebtPayments`
- Return the breakdown so the UI can show the math.

## Rule set B: spending plan (4 buckets + Future You)

Amounts are floored to whole dollars; leftover dollars go to `guilt_free`.

**Normal case (fixedShare ≤ 60%):**

| Bucket | Students (or no steady income) | Steady income (young family) |
|---|---|---|
| `fixed_costs` | actual fixed + debt payments | actual fixed + debt payments |
| savings (`emergency_fund` + `goal_savings`) | **20% of income** (method's 10% savings + its 10% investing share, redirected) | **10% of income** |
| Future You | not allocated; shown as a handoff row (rule set F) | **~10% earmark** shown with FNB advisor handoff (rule set F) |
| `guilt_free` | the rest (target 20 to 35%) | the rest (target 20 to 35%) |

**High fixed costs (fixedShare > 60%) and surplus > 0:** savings = 50% of surplus, guilt-free = 50% of surplus, each at least 5% of income when the surplus allows. Future You shows handoff only ("unlocks when fixed costs drop below 60% of income"). Add a **Big Win** step: "Review your biggest fixed cost" (housing, car, phone).

**Surplus ≤ 0:** savings and guilt-free are 0; plan is `budget` and `habit` steps plus $0 products. Sprout: "First we find your breathing room."

**Inside savings:**
- Starter cushion = 1 × (fixed + debt). Full cushion = 3 × (fixed + debt). Students target starter first; steady-income users target full.
- Until the target cushion is met: 50% `emergency_fund`, 50% `goal_savings`. After: 100% `goal_savings`.
- `goal_savings` split by priority: **P1 60%, P2 25%, P3 15%**, renormalized to the goals present; leftover dollars to P1.

## Rule set C: goal feasibility and gap levers

For each goal:
- `requiredMonthly = ceil(targetAmount / horizonMonths)` (progress so far = 0 for the prototype).
- `onTrack = allocatedMonthly ≥ requiredMonthly`.
- If not on track, compute up to three levers:
  - `more_time`: `newHorizonMonths = ceil(targetAmount / allocatedMonthly)` (omit if allocatedMonthly = 0)
  - `smaller_target`: `reachableAmount = allocatedMonthly × horizonMonths`
  - `turn_up_dial`: `moveFromGuiltFree = requiredMonthly − allocatedMonthly`, **only if** guilt-free after the move stays ≥ 10% of income. Present this first for the user's top-value goal: guilt-free money exists to fund what they love.
- Also report `cushionFillsInMonths` when a cushion is being built, so Sprout can say "after that, your goals get the full amount".

## Rule set D: Step one (first match wins; doable this week)

1. `isFnbCustomer === false` → **Open FNB Student Checking** (students) or the best-fit FNB checking for the life stage, with its fee and how to avoid it. $0. For Penn State students, mention the HUB branch (288 Pollock Road).
2. Customer without the target cushion → **Automate it:** set an automatic transfer on the day money arrives.
3. Surplus ≤ 0 → **Track one month of spending.**
4. Otherwise → the highest-scoring `now` match.

## Rule set E: staging

- `now`: eligible, affordable, foundational (no-fee checking, starter cushion, $0 tools, education, scholarships).
- `next`: eligible today but follows a `now` item.
- `later`: reachable condition; MUST carry `unlockTrigger` + `unlockCondition`.
- Student triggers: secured card → savings ≥ starter cushion + minimum deposit, or `first_paycheck`. Income-dependent products → `first_paycheck` / `internship`. Mortgages and homebuyer programs → `full_time_job` + full cushion.
- Habit step always present: **automate on payday**.
- **Fit-first, fee-transparent:** recommend the FNB account that best fits the user's situation (not simply the cheapest). Every account card states its monthly fee and exactly how THIS user avoids it (e.g. "no monthly fee on Student Checking", "waived with direct deposit"). Framing: Sprout makes sure you never pay a fee you didn't see coming.
- Be honest about weak rates: if a product's published rate is low (e.g. a goal CD at 0.05% APY), the explanation sells the commitment, not the interest.

## Rule set F: Future You (investing, inside our boundary)

Sprout does not recommend investments, funds, or amounts per product. It shows one row:
- Students: "Future You: unlocks with your first full-time paycheck. An FNB advisor can help you start." No amount.
- Steady income, fixedShare ≤ 60%: "Future You: about 10% ($X/month) for the long term. An FNB advisor can help you choose how."
- Otherwise: handoff only with the unlock condition.

## Golden test: Maya (must match exactly)

Inputs (Maya v3): summer_savings $3,000 one_time; aid_refund $2,000 per_semester; family $300 monthly; fixed $650; debt $0; savings $400; credit building; not an FNB customer; values [experiences, freedom] → **Experience Collector**. Goals: travel P1 $2,500 in 12 months ("study abroad in Japan"); credit_building P2 12 months; first_home P3 84 months.

| Output | Value |
|---|---|
| Effective income | $1,133 (300 + 500 + 333) |
| Fixed share | 57% (normal case) |
| Savings 20% | $226 → cushion $113, goals $113 → Japan $69, credit $28, home $16 |
| Guilt-free | $257 (23%) |
| Japan | needs $209/mo, has $69 → off track |
| Levers | turn_up_dial: move $140 (guilt-free stays $117 = 10.3%); more_time: 37 months; smaller_target: $828 |
| Cushion | starter $650, fills in 3 months |
| Step one | Open FNB Student Checking (HUB branch) |
| Now | Student Checking, Learning Center modules, FNB scholarship entry if in catalog |
| Next | Savers Goal CD for the Japan fund |
| Later | SmartSecured card (savings ≥ $1,150 or first paycheck); homebuyer programs (full-time job + 3 months saved) |
| Future You | handoff only, unlocks with first full-time paycheck |
| Not yet | mortgage pre-approval: after steady income and 3 months saved |

## Sprout's voice

1. **Possibility first.** Bad: "You can't afford Japan." Good: "Japan is $140 a month away."
2. **A number and a date.** Bad: "Save more." Good: "$113 a month fills your cushion in 3 months."
3. **Never shame.** Banned: only, just, behind, should have, can't afford, waste.
4. **Plain and short.** Under 20 words per sentence; jargon gets a 5-word explanation ("APY, the interest you earn").
5. **Spend on what you love.** Celebrate the top dial; trim what they don't care about.
6. **Systems over willpower.** Prefer "automate it" to "try to remember".
7. **Big wins over small cuts.** Never tell a student to skip coffee.
8. **Honest.** No promised outcomes, no invented rates, weak rates called weak.
9. **Warm, a little playful.** At most one plant metaphor per screen.

## Persona taglines (fixed; AI may personalize the description, never the label)

| Persona | Tagline |
|---|---|
| Freedom Seeker | You want options, and money is how you buy them. |
| Experience Collector | You'd rather have stories than stuff, so let's fund the stories. |
| Safety Builder | You sleep better with a cushion, so we build that first. |
| Family First | Your money plans start with the people you love. |
| Future Builder | You're playing the long game, and it shows. |
| Simple Saver | You want money to be easy, so we keep it simple and automatic. |

## Latency (demo reliability)

- `/api/profile` uses **Claude Haiku 5.5** (`ANTHROPIC_PROFILE_MODEL`, default `claude-haiku-5-5`): short writing task, faster and cheaper.
- `/api/plan` stays on `ANTHROPIC_MODEL` (Sonnet 5.5) with a **20 second** timeout before falling back to template text.
- Target end-to-end under 15 seconds; the UI narrates the wait (Ethan, #10).

## Prompt contracts (AI routes)

**Profile (`/api/profile`)**
- System: "You are Sprout, a warm, optimistic money coach for college students and young families, built as a prototype for FNB. Follow the voice rules. Never mention specific products or rates. Output JSON only."
- Input: intake answers + the taxonomy persona.
- Output: `persona.description` (personalized, 1 sentence), `richLifeStatement` (1 to 2 sentences in the user's own words), per-goal `motivation`, estimated targets flagged `targetIsEstimate`.

**Plan (`/api/plan`)**
- System: same identity + "You receive a finished plan from Sprout's engine. You only write words. Never change any number, stage, lever, product, or the Step one choice. Stay within budgeting, saving, credit building, and FNB products; for investing or taxes say an FNB advisor can help. Output JSON only."
- Input: engine output (numbers, buckets, stages, triggers, levers, Step one, catalog facts for referenced products).
- Output: `sproutSays` (2 sentences), `headline`, per-match `explanation` tied to the user's motivation, step titles/details, lever wording (top-dial lever first), `bankerSummary`.
- Server validates: unknown product IDs dropped; any changed number rejected in favor of the engine's.
