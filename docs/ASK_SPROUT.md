# Ask Sprout spec (v1)

Approved by Ben, Sat 11:20 PM. Ben owns every chip and every answer rule. Contract: docs/CONTRACTS.md v2.3 (`ChatTurn`, `ChatIntent`, `/api/chat`).

## Goal
Ask Sprout is a personalized agent that knows the person: their persona, goals, money snapshot, plan, and the conversation so far. Chips do most of the work: one tap fills **and sends** a question, so users learn the plan's logic without typing.

## Context the AI gets on every question
Profile (persona, values, goals, rich life), snapshot, plan, the last 6 turns (`history`), and, for chips, the **explain facts** for that intent. Numbers in answers come only from these (number guard); numbers the user typed may be echoed.

## Chips (adaptive: built from the user's plan; never show one that doesn't apply)
Copy lives in `src/lib/client/chatCopy.ts` as functions of `(plan, profile, snapshot)`.

### Starter chips (chat opens; max 3, in this order, skipping any that don't apply)
1. "Why is this my first move?" → `why_step_one`
2. P1 goal off track: "How do I close the $<gap> gap for my <fund>?" → `goal_gap` (goalId). P1 on track: "Can I reach my <fund> sooner?" → `what_if` (+$50, goalId).
3. A `later` match with an unlock exists: "When can I get the <product short name>?" → `when_unlock` (productId). Otherwise: "What if I save $50 more a month?" → `what_if` (+$50).

### Block chips ("?" on each Overview block; tapping opens Ask Sprout and sends)
| Block | Chip | Intent |
|---|---|---|
| Your next move | "Why this first?" | why_step_one |
| FNB fit | "Why this account for me?" / "Any fees I should know?" | why_product / product_fees (productId) |
| Your month | "How did you split my money?" | how_split |
| Safety cushion | "Why 3 months?"; if not full: "How can I fill it faster?" | why_cushion; what_if (+$50, emergency_fund) |
| Goals, P1 lever | the lever's `askSprout` text (DASHBOARD.md) | what_if (amount = move) |
| Goals, other lines | "When does my <fund> start growing?" | when_unlock (goalId) or goal_gap |
| Path item | Now/Next: "Why <product>?"; Later: "What unlocks the <product>?" | why_product; when_unlock |

### Follow-up chips (after every answer; max 2; never repeat a question already in `history`)
| Last intent | Follow-ups |
|---|---|
| why_step_one | "What comes after that?" (why_product, next item) · "How did you split my money?" |
| how_split | "Why 3 months for my cushion?" · "What if I spend $50 less on fun?" (what_if +50 to P1) |
| why_cushion | "How can I fill it faster?" · "Does the money I already have count?" |
| why_product / product_fees | "Any fees I should know?" or "Why this account for me?" (the other one) · "What should I do first?" (why_step_one) |
| when_unlock | "How do I get there faster?" (what_if +50) · "What can I do now instead?" (why_step_one) |
| goal_gap | "What if I move $<move> from guilt-free?" · "What if I give it more time?" |
| what_if (+X) | "What about $<round(X/2)> instead?" · "Where does that money come from?" (how_split) |
| free | "Why is this my first move?" · "What if I save $50 more a month?" |

## Explain facts (server, deterministic; the AI phrases them, a template is the fallback)
| Intent | Facts the engine supplies |
|---|---|
| why_step_one | which rule D row matched and its plain reason, P1 fund, amount |
| how_split | effective income (with the /4 and /9 math), fixed + debt, savings %, cushion/goals split, guilt-free and why it is protected |
| why_cushion | 3 × (fixed + debt) or the $1,000 floor, saved so far, months to milestone and to full, irregular-income reason |
| why_product / product_fees | product name, stage, goal served, fee line and how this user avoids it, rate note, why it fits (score reasons in words, not numbers) |
| when_unlock | unlock trigger and condition, distance to it (dollars or life event), what to do meanwhile |
| goal_gap | required vs allocated, gap, the levers in order |
| what_if | existing `parseWhatIf` result (exact engine math) |

## Answer rules (AI)
- 1 to 4 short sentences, at most 70 words. Possibility first, a number and a date, never shame (SPROUT.md voice rules).
- Use the conversation: refer back naturally ("Like we said about Japan...").
- Advice boundary unchanged: investing or taxes → "When you're ready for that, an FNB advisor can help."
- No follow-up questions inside the answer; the chips carry the next step.

## Memory
- Browser only (`AppState.chat`, last 6 turns, cleared with the session). Sent as `history` on every question. Server stores nothing.
- Next (not tonight): save memory to the user's account with consent, together with Share with FNB.

## Demo check (Maya)
- Starters: "Why is this my first move?" · "How do I close the $140 gap for my travel fund?" · "When can I get the SmartSecured card?"
- Tap 1 → answer cites rule D5 and $69/month; follow-ups appear; tap "What if I move $140 from guilt-free?" → engine numbers (on track, $117 left for fun).
