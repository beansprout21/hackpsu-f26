# AI audit (cycle 3)

Generated 2026-10-25T06:45:51.214Z by `scripts/ai-audit.ts` (#121), seed 12103. Plan model `claude-sonnet-5-5`, profile model `claude-haiku-5-5`.
Sample: 25 users (3 rotating scenarios + generated users stratified by life stage, persona, surplus, FNB customer) through the real profile + plan pipeline, then 50 Ask Sprout answers across all intents. Live AI. Synthetic users only.

## Summary

- Plans: 25 built, 1 plan fallbacks, 0 profile fallbacks, average plan latency 8.1 s, profile 4.8 s.
- Chats: 50 answers, 0 fallbacks (boundary and rate answers are deterministic by design), average latency 2.5 s.
- Fallback rate (plans + chats): 1.3%.
- Wall time 171 s.

### Plan flags (items affected)

| Flag | Items | Examples |
|---|---|---|
| contradiction: product not in plan | 2 | explanation:fnb-direct-mobile-app: Student Checking<br>explanation:fnb-direct-mobile-app: Student Checking |
| fallback used | 1 | plan: ZodError |

### Chat flags (items affected)

| Flag | Items | Examples |
|---|---|---|

## Plans

| User | Life stage | Persona | Surplus | Customer | AI | Plan s | Headline | Flags |
|---|---|---|---|---|---|---|---|---|
| c3-cushion-met | new_grad | Experience Collector | yes | no | yes | 7.7 | Portugal is on track, and your home fund is growing |  |
| c3-fnb-customer | student | Safety Builder | yes | yes | yes | 9.2 | Your safety cushion and first credit score start today |  |
| c3-excellent-credit | new_grad | Experience Collector | yes | no | yes | 10.3 | Your Korea trip and strong credit, both within reach |  |
| c3-gen-00 | student | Freedom Seeker | yes | no | yes | 8.6 | Your business dream has a clear, doable start |  |
| c3-gen-01 | new_grad | Safety Builder | no | no | yes | 8.2 | Find breathing room, then build your own shop |  |
| c3-gen-02 | young_family | Experience Collector | yes | yes | yes | 8.3 | Your first home and a calmer family future |  |
| c3-gen-03 | student | Family First | no | yes | yes | 9.5 | A calmer path to your first home starts here |  |
| c3-gen-04 | new_grad | Future Builder | yes | no | yes | 7.5 | Your shop dream starts with a simple, automated plan |  |
| c3-gen-05 | young_family | Simple Saver | no | no | yes | 6.1 | Your simple, steady home starts with one small step |  |
| c3-gen-06 | student | Freedom Seeker | yes | yes | yes | 9.3 | Your study abroad dream has a clear starting line | **contradiction: product not in plan**: explanation:fnb-direct-mobile-app: Student Checking |
| c3-gen-07 | new_grad | Safety Builder | no | yes | yes | 7.2 | Find breathing room, then watch your goals grow |  |
| c3-gen-08 | young_family | Experience Collector | yes | no | yes | 8.1 | Your first home is on track, with room to roam |  |
| c3-gen-09 | student | Family First | no | no | yes | 8.8 | Find breathing room, then grow your family's future |  |
| c3-gen-10 | new_grad | Future Builder | yes | yes | yes | 7.7 | $102 a month toward your goals, starting with travel |  |
| c3-gen-11 | young_family | Simple Saver | no | yes | yes | 6.2 | First, let's find your breathing room |  |
| c3-gen-12 | student | Freedom Seeker | yes | no | yes | 9.1 | Study abroad now, a home of your own later |  |
| c3-gen-13 | new_grad | Safety Builder | no | no | yes | 7.1 | Your breathing room starts with one quick look |  |
| c3-gen-14 | young_family | Experience Collector | yes | yes | yes | 6.7 | Your family's calmer, richer life starts with $132 a month |  |
| c3-gen-15 | student | Family First | no | yes | yes | 7.6 | Your shop dream starts with finding breathing room |  |
| c3-gen-16 | new_grad | Future Builder | yes | no | **no** | 8.4 | $35 a month toward your goals, starting with safety cushion | **fallback used**: plan: ZodError |
| c3-gen-17 | young_family | Simple Saver | no | no | yes | 8.1 | Find breathing room, then watch your goals grow |  |
| c3-gen-18 | student | Freedom Seeker | yes | yes | yes | 9.1 | A calm, clear plan to build your family fund | **contradiction: product not in plan**: explanation:fnb-direct-mobile-app: Student Checking |
| c3-gen-19 | new_grad | Safety Builder | no | yes | yes | 7.4 | Your first move finds room to grow |  |
| c3-gen-20 | young_family | Experience Collector | yes | no | yes | 7.6 | Your safety cushion and goals start growing today |  |
| c3-gen-21 | student | Family First | no | no | yes | 7.9 | Your home plan starts with finding breathing room |  |

## Chats

| User | Intent | Question | Route | AI | s | Answer | Flags |
|---|---|---|---|---|---|---|---|
| c3-cushion-met | why_step_one | Why is this my first move? | explain | yes | 1.6 | Travel is your top goal, and money moved today turns the plan into progress. Moving $20 now starts your travel fund for two weeks in Portugal. Then automate $226 a month, and you're on track for about 18 months. |  |
| c3-fnb-customer | how_split | How did you split my money? | explain | yes | 1.9 | Your $975 a month covers $700 of fixed costs first, leaving $275. From that, $137 goes to savings ($82 to your safety cushion, $55 to goals) and $138 stays guilt-free. Security is your top value, so the safety cushion gets the biggest share. |  |
| c3-excellent-credit | why_cushion | Why 3 months? | explain | yes | 1.8 | Three months is the cushion size for irregular income: if money pauses for a month or two, rent and bills are still covered. Your $1,900 of monthly costs times 3 makes $5,700, and $190 a month fills it in about 15 months. |  |
| c3-gen-00 | why_product | Why this account for me? | explain | yes | 1.8 | FNB Student Checking is your everyday home base to start right away. It has no monthly fee and no minimum balance, and FNB declines items instead of charging overdraft fees. That keeps your aid refund and job pay in one easy spot, and it fits your budget. |  |
| c3-gen-01 | product_fees | Any fees I should know? | explain | yes | 4.2 | Good news: the $5 monthly charge on FirstRate Business Savings is waived when your average daily balance stays at $500 or more. It's tiered, compounding quarterly, and opens with no minimum in a branch. For today's rate, check the current rate with FNB. |  |
| c3-gen-02 | when_unlock | When can I get the Home Ownership Program? | explain | yes | 5.0 | The Home Ownership Program unlocks when your $6,903 safety cushion is full. You've saved $822 so far, so you're $6,081 away, about 19 months at $333 a month. Until then, try FNB's free mortgage calculators, and check the current rate with FNB. |  |
| c3-gen-03 | goal_gap | How do I close the $151 gap for my home fund? | explain | yes | 1.8 | Your home fund is $151 a month away, and right now your costs use up your income, so the first move is finding breathing room. Open your bank app, find last week's 3 biggest buys, and see what you can shift. FNB's free mortgage calculators can show what $151 … |  |
| c3-gen-04 | what_if | What if I save $50 more a month? | what_if | yes | 1.7 | Adding $50 takes your business fund to $194 a month, and that puts your small business on track. Your timeline shortens from about 9 years to about 7 years. Your guilt-free spending stays at $94 a month. |  |
| c3-gen-05 | free | Can I put my savings in index funds or crypto? | boundary | **no** | 0.0 | When you're ready for that, an FNB advisor can help. |  |
| c3-gen-06 | why_step_one | Why is this my first move? | explain | yes | 2.6 | Your home fund is your top goal, and money moved today turns a plan into progress. Your first $20 starts it now, and automating $114 a month keeps it growing without willpower. Starting today also makes the freedom you want feel real. |  |
| c3-gen-07 | how_split | How did you split my money? | explain | yes | 2.8 | Right now your $573 a month of income is fully used by $746 of fixed costs, so there's nothing left to split into savings or guilt-free spending yet. That leaves a $173 monthly gap. Step one is checking last week's 3 biggest buys to find your breathing room, … |  |
| c3-gen-08 | why_cushion | Why 3 months? | explain | yes | 2.4 | Your income can be irregular, so 3 months of rent and bills gives you a steady cushion if money pauses. That target is $6,597, built from your $2,199 monthly costs. At $279 a month, it fills in about 2 years, and your first month is covered in 8 months. |  |
| c3-gen-09 | why_product | Why this account for me? | explain | yes | 3.8 | FNB Student Checking keeps your family's everyday money simple, and you qualify today. It has no monthly fee, no minimum balance, and no overdraft fees, since FNB declines items instead. Choose e-statements to skip the $3.95 paper statement fee. |  |
| c3-gen-10 | product_fees | Any fees I should know? | explain | yes | 1.7 | Good news: CardGuard is free, with no cost listed on the FNB Consumer Fee Schedule. Real-time alerts, spend limits, and Spend Insights are all included, so you can keep an eye on your guilt-free money at no charge. |  |
| c3-gen-11 | when_unlock | When can I get the SmartCash card? | explain | yes | 5.2 | The SmartCash card unlocks when your credit range reaches fair, and it's a later step toward your home. There's no date yet, since it depends on your credit growing, not on dollars saved. Meanwhile, IRA Savings is a simple place to start your home fund. |  |
| c3-gen-12 | goal_gap | How do I close the $312 gap for my family fund? | explain | yes | 5.3 | Your family fund is $312 a month away from the 12-month goal. Two easy paths: give it more time, since $188 a month reaches $6,000 in about 3 years, or aim for $2,256 in 12 months. Automate the $188 so it grows on its own. |  |
| c3-gen-13 | what_if | What if I save $50 more a month? | what_if | yes | 2.6 | Saving $50 more a month would cover your travel goal's full $4,150 target in about 7 years, so it puts you on track. Right now your costs use up your income, so step one is finding that breathing room. Opening your bank app and checking last week's 3 biggest … |  |
| c3-gen-14 | free | What if I save $25 more a month? | what_if | yes | 1.6 | Adding $25 takes you from $132 to $157 a month, and your family fund reaches $5,000 in about 3 years instead of 38. You still have $723 a month for things you love. Closing the full gap to $5,000 in 12 months is $260 a month away. |  |
| c3-gen-15 | why_step_one | Why is this my first move? | explain | yes | 1.7 | Right now your costs use everything coming in, so the first win is finding breathing room. Checking last week's 3 biggest buys shows where that room could come from, and it takes a few minutes in your bank app. Once there's room, your family fund and shop goa… |  |
| c3-gen-16 | how_split | How did you split my money? | explain | yes | 2.8 | Here's how your $693 a month splits: $341 covers fixed costs, $69 goes to savings ($34 to your safety cushion, $35 to goals), and $214 is guilt-free money, protected for what helps you grow. That leaves $352 of breathing room each month, and you can automate … |  |
| c3-gen-17 | why_cushion | Why 3 months? | explain | yes | 1.8 | Your income is irregular, so 3 months of cushion keeps rent and bills covered if money pauses for a month or two. Your fixed costs and debt come to $2,163 a month, so the full cushion is $6,489. A first milestone is 1 month covered at $2,163. |  |
| c3-gen-18 | why_product | Why this account for me? | explain | yes | 1.7 | The Knowledge Center fits your family goal, it's free, and you can start today. Its articles on budgeting and saving for family can help you feel calmer about money. Your family goal is $634 a month away, so these are a good first step while you plan. |  |
| c3-gen-19 | product_fees | Any fees I should know? | explain | yes | 1.5 | Good news: the Financial Insights Learning Center is free and self-paced, so there are no fees to plan around. You can start with the Creating a Budget module whenever you like. |  |
| c3-gen-20 | when_unlock | When can I get the Home Ownership Program? | explain | yes | 1.8 | The Home Ownership Program unlocks when your $6,105 safety cushion is full. You've saved $891, and at $185 a month that's about 2 years away. Meanwhile, the Mortgage calculators are free to try for your shop plans today. |  |
| c3-gen-21 | goal_gap | How do I close the $539 gap for my home fund? | explain | yes | 1.9 | Your home fund is $539 a month away, and right now your costs use up your income, so step one is finding breathing room. Open your bank app and find last week's 3 biggest buys. The FNB Home Ownership Program unlocks once you have a full-time job and your $7,3… |  |
| c3-cushion-met | what_if | Can I reach my travel fund sooner? | what_if | yes | 2.0 | Yes! Adding $50 a month takes your travel fund from $226 to $276 a month, so your $4,000 Portugal goal lands in about 15 months instead of 18. You stay on track, and your guilt-free spending stays at $910, so you keep spending on what you love. Automate the e… |  |
| c3-fnb-customer | free | Should I get a credit card now? | general | yes | 2.5 | A card is a great goal, and your path starts with the FNB SmartSecured Credit Card. It unlocks once your savings reach $1,200 (one month of costs plus the $500 deposit), or when your first paycheck arrives. It has no annual fee. Until then, Credit Center give… |  |
| c3-excellent-credit | why_step_one | Why is this my first move? | explain | yes | 3.1 | It's one move you can do this week that gets your Korea trip rolling. Your travel fund is on pace for about 16 months at $190 a month, and a first $20 plants the seed. Then automate the monthly transfer so it grows without willpower. |  |
| c3-gen-00 | how_split | How did you split my money? | explain | yes | 2.1 | Your plan starts with $553 a month. Bills and debt take $381. Then $86 goes to savings ($43 for your safety cushion, $43 for your business fund), and $86 is guilt-free money to spend on the freedom you love. You can automate those transfers. |  |
| c3-gen-01 | why_cushion | Why 3 months? | explain | yes | 1.6 | Your income is irregular, so 3 months of costs keeps rent and bills covered if it pauses for a month or two. That's a $8,385 safety cushion, built from your $2,795 in monthly fixed costs and debt payments. You've already saved $1,094, a great seed to grow fro… |  |
| c3-gen-02 | why_product | Why this account for me? | explain | yes | 2.2 | Mortgage calculators fit your first home goal, and they're free to try today. They turn the unknown into real numbers, which helps you feel calmer. That matches your wish for less stress and room for experiences with the people you love. |  |
| c3-gen-03 | product_fees | Any fees I should know? | explain | yes | 1.5 | Good news: Mortgage calculators are free, a simple tool on FNB's website, so you can explore your first home goal at no cost. You can run affordability and down payment comparisons whenever you like, with nothing to pay along the way. |  |
| c3-gen-05 | goal_gap | How do I close the $139 gap for my business fund? | explain | yes | 2.1 | Your business fund is $139 a month away, and right now your costs use up your income. So the first step is finding breathing room: open your bank app and look at last week's 3 biggest buys. Once there's room, automate $139 a month so the fund grows on its own. |  |
| c3-gen-06 | what_if | How can I fill it faster? | what_if | yes | 2.5 | Adding $50 a month turns your safety cushion from about 13 months into about 10 months, for $211 a month in total. Your goal is $2,865, and your guilt-free money still lands at $283. FirstRate Savings is where it grows. Its 0.01% APY is weak, so it's about sa… |  |
| c3-gen-07 | free | Why is my safety cushion this size? | general | yes | 2.2 | Your safety cushion target is $2,238, about three months of your $746 monthly fixed costs. That way a surprise bill won't derail your new career. Your cushion goal is $27 a month away, and finding that breathing room is our first step. FirstRate Savings can g… |  |
| c3-gen-08 | why_step_one | Why is this my first move? | explain | yes | 5.1 | Your home fund is your top goal, and money moved today turns the plan into progress. Moving $20 now starts the habit, and then $280 a month, set to automate, keeps it growing. At that pace you're on track to reach it in about 4 years. |  |
| c3-gen-09 | how_split | How did you split my money? | explain | yes | 2.4 | Your $1,802 a month income goes first to fixed costs and debt, which total $2,056. That leaves nothing to split into your safety cushion, goals, or guilt-free spending yet, so step one is finding breathing room. Once we do, your family and your kids' trips co… |  |
| c3-gen-10 | why_cushion | Why 3 months? | explain | yes | 2.1 | Your income is irregular, so 3 months of fixed costs and debt payments ($378 a month) gives you a $1,134 safety cushion. If money pauses for a month or two, rent and bills are still covered. You've already saved $2,278, so it's fully met. |  |
| c3-gen-11 | why_product | Why this account for me? | explain | yes | 1.6 | The Learning Center is free, so it costs nothing while we find your breathing room. Its Car Loans and Buying a Home modules match your calm, simple plan for a reliable work car and a home. Go at your own pace. |  |
| c3-gen-12 | product_fees | Any fees I should know? | explain | yes | 2.2 | Good news: FNB Student Checking has no monthly fee, no minimum balance, and no overdraft fees. FNB declines items instead. Choose e-statements to skip the $3.95 paper statement charge. It also refunds the $2.95 non-FNB ATM fee up to 4 times per cycle. |  |
| c3-gen-14 | goal_gap | How do I close the $285 gap for my family fund? | explain | yes | 2.6 | Your family fund is $285 a month away from the 12-month goal. Turn up your savings dial by $285, taking your guilt-free spending from $748 to $463, and you're on track. Or give it more time: at $132 a month you'd reach $5,000 in about 3 years. |  |
| c3-gen-15 | what_if | What if I save $50 more a month? | what_if | yes | 3.3 | An extra $50 a month is a real start, but at that pace your family fund of $13,800 would take about 23 years. Your plan needs $767 a month to hit the 18-month goal, so $717 a month away. Finding breathing room in your costs comes first. |  |
| c3-gen-16 | free | What about $40 instead? | what_if | yes | 2.8 | Like we said about $60, $40 more is a great boost too! Your safety cushion would go from $34 to $74 a month and fill in about 14 months instead of about 3 years. You'd still have $174 a month guilt-free to spend on what you love. |  |
| c3-gen-17 | why_step_one | Why is this my first move? | explain | yes | 1.8 | Right now your costs use everything coming in, so finding breathing room comes first. Your family fund is $10 a month away, and a quick look at last week's 3 biggest buys shows where that room hides. Once it opens, your goals have somewhere to grow. |  |
| c3-gen-18 | how_split | How did you split my money? | explain | yes | 2.5 | Your plan starts with $373 a month of income. Fixed costs take $118, then $74 goes to your goals and $181 stays guilt-free, protected for the freedom you love. Automate that $74 and your family and travel funds keep growing on their own. |  |
| c3-gen-19 | why_cushion | Why 3 months? | explain | yes | 1.6 | Your income can be irregular, so 3 months of costs keeps rent and bills covered if it pauses for a month or two. That's 3 x $1,523, or a $4,569 safety cushion. You've already saved $2,662 toward it, which is a strong start. |  |
| c3-gen-20 | why_product | Why this account for me? | explain | yes | 2.5 | IRA Savings fits your family goal, your budget, and you can open it today. There's no minimum to open and no monthly service charge, so it's a gentle place to start your car-for-work fund. The rate is weak at 0.01% APY, so think of it as a home base, not a gr… |  |
| c3-gen-21 | product_fees | Any fees I should know? | explain | yes | 2.6 | Good news: FNB Student Checking has no monthly fee, no minimum balance, and no overdraft fees. The one to watch is the $3.95 paper statement fee, and choosing e-statements makes it free. It also refunds FNB's $2.95 non-FNB ATM fee up to 4 times per cycle. |  |
| c3-cushion-met | when_unlock | When can I get the Home Ownership Program? | explain | yes | 5.4 | Good news: your safety cushion is already full, so the Home Ownership Program is open to you whenever you're ready to buy. It offers little to no down payment and up to $5,000 in closing cost help; check the current rate with FNB. Meanwhile, the Mortgage calc… |  |
| c3-fnb-customer | goal_gap | How do I close the $38 gap for my safety cushion? | explain | yes | 1.9 | Your safety cushion is $38 a month away from its 12-month target. Turning up that dial by $38 (moving it from your guilt-free money) closes the gap, and your guilt-free would still be $100 a month. Automate the move so it happens. Or keep today's pace and you… |  |
