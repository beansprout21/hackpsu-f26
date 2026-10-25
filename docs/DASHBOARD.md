# Plan dashboard spec (v1)

Approved by Ben, Sat 11:00 PM. **Ben owns every word and every rule on this page; Ethan owns how it looks.** Numbers come from the engine (`docs/SPROUT.md` v3); this file says what the user sees and in what order.

## Principle
One screen, one job: *here is your next move, and here is why it works.* After 10 seconds the user remembers **their one next move** and **their biggest goal gap**. Everything else is one tap away.

## Structure
- Keep Ethan's tabs. **Overview is the complete plan**: a judge or user never needs another tab to understand it. Money, Goals, Roadmap hold the detail.
- Ask Sprout stays exactly as Ethan has it (docked column on desktop, button + bottom sheet on mobile).
- At most **3 product recommendations up front** (one per stage, in "Your path"). All other matches live in the Roadmap tab.
- Score breakdowns are removed from the user view (the banker dashboard keeps them).

## Overview blocks (in this order)

| # | Block | Shows | One tap away |
|---|---|---|---|
| 1 | Your next move | Persona chip; Step one title + detail (SPROUT.md rule D, templates); **Done** button (client-only celebration); the FNB fit right under it | "Why this first?" opens Ask Sprout with that question |
| 2 | Your month | "You have $X a month to work with." + one 3-part bar: safety cushion / goals / guilt-free | Money tab: full math, 4 buckets, Future You |
| 3 | Your safety cushion | Target, reason line, progress bar with the 1-month milestone, fill time, "it counts" note | Money tab |
| 4 | Your goals | One line per goal (rules below); one lever button on the P1 goal only | Goals tab: all levers, required vs allocated |
| 5 | Your path | Now / Next / Later: one item each, Later shows its unlock condition | Roadmap tab: every step and product with the trust layer, not-yet list |
| 6 | Take it to FNB | Book with an FNB banker (primary), Save for my banker (PDF), Share my plan with FNB, Banker view (demo) link | Consent text opens on Share |

Disclaimer at the bottom, unchanged.

## View model (Ben's agent builds it; Ethan renders it)
Pure function `buildOverview(plan, profile, snapshot)` in `src/lib/client/overview.ts` returns:

```ts
interface OverviewModel {
  persona: { label: string; tagline: string };
  nextMove: { title: string; detail: string; link?: string };        // plan.stepOne; link only for rule D2
  fnbFit: { productId: string; name: string; line: string } | null;   // top `now` match
  month: { toWorkWith: number; sentence: string; bar: { cushion: number; goals: number; guiltFree: number } };
  cushion: { target: number; saved: number; pct: number; milestone: number; milestoneInMonths: number | null;
             fullInMonths: number | null; met: boolean; title: string; reason: string; progressLine: string; note: string };
  goals: { goalId: GoalId; line: string; tone: "gap" | "on_track" | "on_path" | "later";
           lever?: { label: string; askSprout: string } }[];
  path: { stage: Stage; title: string; detail: string; productId?: string; unlock?: string }[];  // max 3
}
```
All strings live in `src/lib/client/planCopy.ts` so Ben can edit text in one place.

## Copy rules (templates; `$` values from the engine)

**Your month**
- Surplus > 0: "You have $<monthlySurplus> a month to work with."
- Surplus ≤ 0: "Right now your costs use everything coming in. Your next move finds some breathing room."

**Your safety cushion**
- Title: "Your safety cushion: $<cushionTarget>"
- Reason: "If money stops coming in for up to 3 months, your rent and bills are still covered."
- Progress: "$<saved> of $<target> · 1 month covered in <N> months · full in <M> months" (drop the milestone part once passed)
- Met: "Your safety cushion is full. Every savings dollar now goes to your goals."
- Note: "Already have savings set aside? It counts."

**Your goals** (the `emergency_fund` goal is not listed here; it is the cushion block)
- P1, on track: "<Fund> is on track: $<monthlyAmount> a month gets you there."
- P1, off track: "<Fund> is $<gap> a month away." Lever button (v3.1 order): turn_up_dial if offered; else more_time **only if newHorizonMonths ≤ 60**; else smaller_target; else, if the plan has the Big Win step, "Review your biggest fixed cost" → Ask Sprout "How can I lower my biggest fixed cost?"; else no button.
  - turn_up_dial: "See what moving $<move> from guilt-free does" → Ask Sprout: "What if I move $<move> a month from guilt-free to my <fund>?"
  - more_time: "See it with more time" → "What if I give my <fund> <newHorizonMonths> months?"
  - smaller_target: "See a smaller target" → "What if my <fund> target were $<reachableAmount>?"
- Other goals with money going in (v3.1): "<Fund>: $<monthlyAmount> a month going in", plus ", about <N> months at your pace" only when N ≤ 2 × horizon.
- Other goals with $0 going in: "<Fund>: starts growing after <unlock>", where unlock = the `unlockCondition` of that goal's `later` match; else "your safety cushion is full" if it isn't; else "your top goal is on track".
- Never red, never "off track" wording for non-P1 goals.

**Your path**
- Now: the FNB fit product (name + first sentence of its explanation, ≤ 20 words).
- Next: first `next` match, same format.
- Later: first `later` match + "Unlocks when <unlockCondition>."

**Ask Sprout starter questions:** "Why this first?", "What if I save $50 more a month?", "When can I get a credit card?"

## AI text budget (plan prompt)
- `sproutSays`: 2 sentences, ≤ 35 words total.
- Match `explanation`: first sentence ≤ 20 words (the path shows only that sentence).
- `headline`: ≤ 10 words.
- The AI never writes Step one, cushion, month, goal-line, or path templates above.

## Maya check (golden, for the Overview)
- Next move: "Move $20 into your travel fund right now." / "You'll put $69 a month toward it. This starts it."
- FNB fit: FNB Student Checking.
- Month: "You have $483 a month to work with." Bar $113 / $113 / $257.
- Cushion: "$400 of $1,950 · 1 month covered in 3 months · full in 14 months".
- Goals: "Travel fund is $140 a month away." + "See what moving $140 from guilt-free does"; credit building and home lines follow the rules above.
- Path: Now Student Checking; Next Savers Goal CD; Later SmartSecured card, unlocks at $1,150 saved or first paycheck.
