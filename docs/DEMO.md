# Demo Script

Owner: Ethan (this version: Ben's builder agent, Ben approved). Judging expo: Sun 2:00 to 3:30 PM, ECoRE 2nd floor.
Ethan presents; Ben drives the laptop and takes technical questions. Expo table, about 3 minutes.

Numbers below are Maya's current engine output (SPROUT.md v3.4 golden, after #143). Check them on the live site before the expo.

## 30-second hook
"Raise your hand if you trusted a bank at 19. Most students don't, and banks start the conversation with a credit score they don't have yet. Ben learned money from one book that started with a different question: what does your rich life look like? We built that into a bank. This is Sprout."

## Live demo steps (with fallback if AI call fails)
As Maya, a Penn State student with no steady job. **No sign-in until step 6**: intake, snapshot, plan and Ask Sprout all work without an account (#157).

| Beat | What we show | What we say |
|---|---|---|
| 1 | Swipe cards, persona reveal | "Maya would rather backpack Japan than eat out. Sprout calls her an Experience Collector." |
| 2 | Goals on the timeline, then the money screen (Fill in as Maya): summer savings and aid refunds | "She has summer savings and aid refunds, no paycheck. Sprout spreads them over the school year: $1,133 a month, $650 for fixed costs, $483 to work with." |
| 3 | Plan, Step one | "Step one takes two minutes from her phone: move $20 into her travel fund. After that, $80 a month goes to Japan on its own." Then step 2: "Open FNB Student Checking to hold it", no monthly fee. |
| 4 | Your goals: Japan off track + lever | "Japan is $129 a month away, so Sprout shows real options: move $129 of guilt-free money and she's on track, give it 32 months (about 3 years), or aim for $960 first. Her call." Tap the lever to show Ask Sprout answering with the same numbers. |
| 5 | Safety cushion, Later step, Not yet | "Her safety cushion is $1,950 and fills in 14 months. The SmartSecured card unlocks at $1,150 saved or her first paycheck. No mortgage pitch: the homebuyer program waits for a steady income and 3 months saved. That honesty is the trust." |
| 6 | Take it to FNB | "One tap books an FNB banker." Then **Share with FNB**: the button reads "Sign in to share with FNB" → Auth0 sign-in → back on her plan, intact → consent → shared. Open **Banker view (demo)**: "The banker sees her goals before they meet." (Save for my banker (PDF) works the same way: sign in, then print.) |

**Proof moment (20 seconds).** Re-run Maya with opposite swipes (Demo shortcuts → "Maya, opposite swipes"): same money and goals, a different persona and plan. "The plan follows her life, not her credit score."

**Close (20 seconds).** "FNB gets customers at 19 who trust them by 25. Students get a plan they can start today."

**If something fails:**
- AI slow or down: the plan still renders from the engine with template wording (`aiUsed: false`); every number is the same.
- Auth0 sign-in fails at step 6: skip Share and Save PDF, show Book a banker, and say the plan stays on her device until she chooses to share. The server-side emergency switch `DEMO_AUTH_BYPASS=1` (env var, needs a redeploy) skips Auth0 checks; confirm how it behaves after #157 before relying on it.
- Wifi dies: use the recorded video and screenshots on the second laptop.

## Why it matters / impact
Young adults are losing financial ground fastest, learn money from social media, and already turn to AI they don't trust. For the pitch, use three numbers: the Federal Reserve's falling well-being for 18 to 29 year olds, FINRA's 61% of young investors acting on a finfluencer tip, and Gallup's use-without-trust gap for AI money advice (sources in the Devpost write-up). For FNB, every shared plan is a warm lead with the customer's goals attached.

## How we used AI
A deterministic engine makes every number, stage, product choice and Step one; Claude only writes the words (Sonnet 5.5 for plans and Ask Sprout, Haiku 5.5 for profiles). Guards reject any AI sentence with a number the engine didn't produce, a banned word, or a gap claim that doesn't match the plan, and the server drops any product not in FNB's catalog.

## Likely judge questions + answers
| Question | Answer |
|---|---|
| Isn't this just a ChatGPT wrapper? | No. A deterministic engine makes every number, stage and product choice; the AI only explains it, and the server blocks anything not in FNB's catalog. |
| Where do the products and rates come from? | FNB's public website and fee schedule, each linked with a verified date. |
| Why would FNB want a tool that says "not yet"? | Trust is the challenge. Restraint now earns the mortgage later, and every shared plan is a warm lead. |
| What about students with zero income? | Step one is always doable today, and later items unlock on life events like the first paycheck. |
| Why no login at the start? | You see the value first; you sign in only when your plan leaves your device (Save PDF or Share with FNB). |
| Is this financial advice? | It's an educational prototype within budgeting, saving and credit; for investing or taxes it hands off to an FNB advisor. |
| What's the business model? | Customer acquisition and deeper relationships for FNB, plus pre-qualified banker conversations. |
