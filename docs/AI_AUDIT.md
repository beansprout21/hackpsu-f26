# AI audit (cycle 2)

Generated 2026-10-25T06:38:06.900Z by `scripts/ai-audit.ts` (#121), seed 12102. Plan model `claude-sonnet-5-5`, profile model `claude-haiku-5-5`.
Sample: 25 users (3 rotating scenarios + generated users stratified by life stage, persona, surplus, FNB customer) through the real profile + plan pipeline, then 50 Ask Sprout answers across all intents. Live AI. Synthetic users only.

## Summary

- Plans: 25 built, 1 plan fallbacks, 0 profile fallbacks, average plan latency 7.8 s, profile 5.5 s.
- Chats: 50 answers, 0 fallbacks (boundary and rate answers are deterministic by design), average latency 2.2 s.
- Fallback rate (plans + chats): 1.3%.
- Wall time 170 s.

### Plan flags (items affected)

| Flag | Items | Examples |
|---|---|---|
| contradiction: on track vs gap | 3 | sproutSays says gap, engine has on track: "Your first home is $75 a month away, about 7 years at this pace."<br>sproutSays says gap, engine has on track: "Travel is $61 a month away from fitting your plan, by turning up your guilt-free dial." |
| fallback used | 1 | plan: ZodError |

### Chat flags (items affected)

| Flag | Items | Examples |
|---|---|---|

## Plans

| User | Life stage | Persona | Surplus | Customer | AI | Plan s | Headline | Flags |
|---|---|---|---|---|---|---|---|---|
| c2-no-income | student | Experience Collector | no | no | yes | 7.2 | Your first $1,000 for learning is within reach |  |
| c2-parents-pay-rent | student | Experience Collector | yes | no | yes | 9.4 | Spring break and a safety cushion, both within reach |  |
| c2-high-fixed | new_grad | Safety Builder | yes | no | yes | 8.6 | Your safety cushion and first home are both in reach |  |
| c2-gen-00 | student | Freedom Seeker | yes | no | yes | 8.9 | Your freedom and family plan, ready to grow |  |
| c2-gen-01 | new_grad | Safety Builder | no | no | yes | 9.3 | Your path to a secure, simple start |  |
| c2-gen-02 | young_family | Experience Collector | yes | yes | yes | 8.1 | A safety cushion and a work car are within reach |  |
| c2-gen-03 | student | Family First | no | yes | yes | 7.2 | Find your breathing room, then grow your safety cushion |  |
| c2-gen-04 | new_grad | Future Builder | yes | no | yes | 6.2 | Your first home is about 7 years away | **contradiction: on track vs gap**: sproutSays says gap, engine has on track: "Your first home is $75 a month away, about 7 years at this pace." |
| c2-gen-05 | young_family | Simple Saver | no | no | yes | 8.0 | A calm, simple path to your shared adventures |  |
| c2-gen-06 | student | Freedom Seeker | yes | yes | yes | 8.3 | Your shop dream starts with $63 a month |  |
| c2-gen-07 | new_grad | Safety Builder | no | yes | yes | 7.5 | Find your breathing room, then build your home fund |  |
| c2-gen-08 | young_family | Experience Collector | yes | no | yes | 6.9 | A steady safety cushion, then room for family adventures |  |
| c2-gen-09 | student | Family First | no | no | yes | 6.2 | Your education goal starts with finding breathing room |  |
| c2-gen-10 | new_grad | Future Builder | yes | yes | yes | 6.7 | Your education fund starts today, and it can grow |  |
| c2-gen-11 | young_family | Simple Saver | no | yes | yes | 5.0 | A calm, steady path to your family's breathing room |  |
| c2-gen-12 | student | Freedom Seeker | yes | no | yes | 8.7 | Your shop dream starts with a safety cushion |  |
| c2-gen-13 | new_grad | Safety Builder | no | no | yes | 9.2 | Find breathing room first, then every goal gets closer |  |
| c2-gen-14 | young_family | Experience Collector | yes | yes | yes | 7.6 | Your business, your trips, and a full safety cushion | **contradiction: on track vs gap**: sproutSays says gap, engine has on track: "Travel is $61 a month away from fitting your plan, by turning up your guilt-free dial." |
| c2-gen-15 | student | Family First | no | yes | yes | 7.2 | Your small business dream starts with one clear look |  |
| c2-gen-16 | new_grad | Future Builder | yes | no | yes | 8.3 | Your shop and study abroad now have a clear path |  |
| c2-gen-17 | young_family | Simple Saver | no | no | yes | 8.3 | Your steady home plan starts with one quick look |  |
| c2-gen-18 | student | Freedom Seeker | yes | yes | yes | 8.5 | Your first home fund starts today, not someday | **contradiction: on track vs gap**: sproutSays says gap, engine has on track: "A first home is $225 a month away, and you're already on track." |
| c2-gen-19 | new_grad | Safety Builder | no | yes | yes | 6.5 | Your study abroad dream has a steady path |  |
| c2-gen-20 | young_family | Experience Collector | yes | no | yes | 8.7 | Your first home and your safety cushion, mapped out |  |
| c2-gen-21 | student | Family First | no | no | **no** | 8.4 | First, let's find your breathing room | **fallback used**: plan: ZodError |

## Chats

| User | Intent | Question | Route | AI | s | Answer | Flags |
|---|---|---|---|---|---|---|---|
| c2-no-income | why_step_one | Why is this my first move? | explain | yes | 1.7 | Right now your $400 in monthly costs use everything coming in, so the first win is finding breathing room. Spotting your 3 biggest buys from last week shows where it hides. Once there's room, your education fund and safety cushion have somewhere to grow. |  |
| c2-parents-pay-rent | how_split | How did you split my money? | explain | yes | 1.6 | Of your $600 a month, $150 covers fixed costs. $120 (20%) goes to savings: $60 to your safety cushion and $60 to your travel fund. That leaves $330 (55%) guilt-free, protected for the experiences you love. |  |
| c2-high-fixed | why_cushion | Why 3 months? | explain | yes | 1.7 | Your income can be irregular, so 3 months of costs is a steady buffer if pay pauses. Your $1,550 in monthly costs times 3 makes the $4,650 safety cushion. You've already saved $300, and $135 a month fills it in about 3 years. |  |
| c2-gen-00 | why_product | Why this account for me? | explain | yes | 1.9 | FNB Student Checking fits your everyday banking goal, and you qualify today. It has no monthly fee, no minimum balance, and no overdraft fees, so your budget stays calm. Choose e-statements to skip the $3.95 paper fee. |  |
| c2-gen-01 | product_fees | Any fees I should know? | explain | yes | 1.7 | Freestyle Checking has no monthly fee when you choose free online statements, so staying paperless keeps it at zero. Paper statements run $3.95 plus $3.00 for check images each cycle. Overdrafts are $35 per item (none on items of $5 or less), so automate aler… |  |
| c2-gen-02 | when_unlock | When can I get the SmartRate card? | explain | yes | 1.8 | The SmartRate card opens up when your credit range reaches fair, so it's tied to your credit progress rather than a date. It has no annual fee and a 0% intro rate for 12 months. Meanwhile, FirstRate Savings is a great home for your safety cushion. |  |
| c2-gen-03 | goal_gap | How do I close the $24 gap for my safety cushion? | explain | yes | 1.8 | The $24 a month is the first seed of your safety cushion, and your plan starts by finding breathing room. Open your bank app and look at last week's 3 biggest buys; a big one is where the $24 can come from. Then automate it into FirstRate Savings so it grows … |  |
| c2-gen-04 | what_if | Can I reach my home fund sooner? | what_if | yes | 1.5 | Yes! Adding $50 a month takes your home fund to $125 a month, so you could reach your $5,850 target in about 4 years instead of about 7. Your guilt-free spending stays at $134 a month, so your plan keeps room for what you love. Automate it so it grows on its … |  |
| c2-gen-05 | free | Can I put my savings in index funds or crypto? | boundary | **no** | 0.0 | When you're ready for that, an FNB advisor can help. |  |
| c2-gen-06 | why_step_one | Why is this my first move? | explain | yes | 1.7 | Education is your top goal, and it's the first step toward running your own shop. Moving $20 today starts your $63 a month and turns the plan into real progress. Automate it so the habit runs itself. |  |
| c2-gen-07 | how_split | How did you split my money? | explain | yes | 1.6 | Your income works out to $1,802 a month, and fixed costs plus debt take $2,331, so there's nothing left to split yet. That's a $529 gap, so your first step is finding breathing room: open your bank app and look at last week's 3 biggest buys. Once there's room… |  |
| c2-gen-08 | why_cushion | Why 3 months? | explain | yes | 2.4 | Your income can be irregular, so 3 months of rent and bills gives you breathing room if money pauses. That's $3,185 a month in fixed costs and debt, so a full cushion is $9,555. Saving $323 a month fills it in about 14 months. |  |
| c2-gen-09 | why_product | Why this account for me? | explain | yes | 1.6 | FNB Student Checking is a fee-free home base for your aid refund and family support. It has no monthly fee and no overdraft fees, and it refunds FNB's $2.95 non-FNB ATM fee up to 4 times per cycle. Pick e-statements to skip the $3.95 paper fee. |  |
| c2-gen-10 | product_fees | Any fees I should know? | explain | yes | 1.5 | Good news: the Financial Insights Learning Center is free, as stated on FNB's learning pages (as of Oct 24, 2026). There are no fees to start, and you can begin today. It's a great no-cost way to grow your skills. |  |
| c2-gen-12 | goal_gap | How do I close the $29 gap for my safety cushion? | explain | yes | 5.3 | You're $29 a month from a running start on your safety cushion. Your plan shows a way: move $29 from your $677 guilt-free money, leaving $648 for what you love. Automate it so it happens on its own. FirstRate Savings is a ready home for it. |  |
| c2-gen-13 | what_if | How can I fill it faster? | what_if | yes | 2.2 | Adding $50 a month would grow your safety cushion to its $7,986 target in about 7 months. Right now nothing is going into it, so automating that $50 is a great first seed. FirstRate Savings is a home for it, though its 0.01% APY rate is weak. |  |
| c2-gen-14 | free | What if I save $25 more a month? | what_if | yes | 2.3 | Adding $25 takes your small business fund from $382 to $407 a month, so you'd reach your $11,800 goal in about 2 years instead of about 3 years. You'd stay on track, and your guilt-free spending stays healthy at $1,056 a month. |  |
| c2-gen-15 | why_step_one | Why is this my first move? | explain | yes | 1.8 | Your costs use everything coming in right now, so finding breathing room comes first. Checking last week's 3 biggest buys shows where your money goes. Once there's room, your business fund can start growing toward stopping the rent. |  |
| c2-gen-16 | how_split | How did you split my money? | explain | yes | 1.6 | Of your $1,972 a month, $609 covers fixed costs and $197 goes to savings: $98 to your safety cushion and $99 to goals. That leaves $969 (49%) guilt-free, protected for what helps you grow. Your safety cushion fills in 13 months. |  |
| c2-gen-17 | why_cushion | Why 3 months? | explain | yes | 2.0 | Your income is irregular, so 3 months of rent and bills ($6,842 a month) gives you room if money pauses for a month or two. That makes your safety cushion $20,526. First stop is 1 month covered, $6,842, and finding breathing room in your spending gets you the… |  |
| c2-gen-18 | why_product | Why this account for me? | explain | yes | 2.3 | Mortgage calculators fit your first home goal, they're free, and you can use them today. Try the affordability and down payment tools to see what your $225 a month toward the home fund could grow into. It's a gentle way to make a calmer, less stressful home f… |  |
| c2-gen-19 | product_fees | Any fees I should know? | explain | yes | 2.1 | One fee to know: FirstRate Business Savings has a $5 monthly charge, waived with a $500 minimum average daily balance. There's no minimum to open in a branch. The rate is tiered, so check the current rate with FNB. |  |
| c2-gen-20 | when_unlock | When can I get the Home Ownership Program? | explain | yes | 1.9 | The Home Ownership Program is about 11 months away! It unlocks when your $8,280 safety cushion is full. You've saved $4,857, so $3,423 to go, and $315 a month gets you there. Meanwhile, the mortgage calculators let you play with first home numbers today. |  |
| c2-gen-21 | goal_gap | How do I close the $220 gap for my safety cushion? | explain | yes | 1.9 | Right now your costs use up your income, so your plan puts $0 toward the safety cushion. Closing the $220 monthly gap starts with finding breathing room. Open your bank app and look at last week's 3 biggest buys. Once there's room, automate the $220 so it hap… |  |
| c2-no-income | what_if | What if I save $50 more a month? | what_if | yes | 2.0 | Adding $50 a month puts your education fund on a path to $1,000 in about 20 months. That's close to your $84 a month target but not quite there yet. Right now your costs use up your income, so step one is finding that breathing room. Then automate the $50. |  |
| c2-parents-pay-rent | free | Should I get a credit card now? | general | yes | 5.4 | A credit card can wait a little. Your plan's next step is filling your $1,000 safety cushion, about 14 months away, and FNB's Learning Center has a free Credit Cards module to explore first. I don't have a published FNB credit card product to point to, so che… |  |
| c2-high-fixed | why_step_one | Why is this my first move? | explain | yes | 5.2 | Your home fund is your top goal, so starting with $20 today turns the plan into real progress. It also plants the first seed of your $4,650 safety cushion, which keeps your home dream steady. Automate it so it happens on its own. |  |
| c2-gen-00 | how_split | How did you split my money? | explain | yes | 1.7 | Your $773 a month covers $495 of fixed costs first. The rest splits into $69 for your safety cushion, $70 for goals, and $139 guilt-free, protected for the freedom you love. That leaves $278 of breathing room each month. |  |
| c2-gen-01 | why_cushion | Why 3 months? | explain | yes | 2.1 | Your income can be irregular, so 3 months of fixed costs and debt payments is a steady cushion if money pauses. That's 3 x $2,082, or $6,246. You've already saved $5,623, and your first month, $2,082, is covered. |  |
| c2-gen-02 | why_product | Why this account for me? | explain | yes | 2.1 | Your education goal is a reliable work car, and these free lessons on car loans and credit help you plan it. It's free, self-paced, and you can start today. It also fits your budget, so there's nothing to set up or pay. |  |
| c2-gen-03 | product_fees | Any fees I should know? | explain | yes | 2.3 | Good news: FirstRate Savings has no early-closing fee. It has a $5 monthly charge, but your $3,311 in savings means it's waived with a $500 average daily balance. You get 6 free transfers or withdrawals a month, then $15 each. Opening costs $0 in a branch, or… |  |
| c2-gen-04 | when_unlock | When can I get the Home Ownership Program? | explain | yes | 2.2 | Good news: the Home Ownership Program is open to you whenever you're ready to buy, since your safety cushion is already full and your $1,474 saved clears the $1,257 mark. It can mean little to no down payment and up to $5,000 in closing cost help. Meanwhile, … |  |
| c2-gen-05 | goal_gap | How do I close the $399 gap for my travel fund? | explain | yes | 1.7 | Your travel fund needs $399 a month for about 3 years, and right now your costs use up your income. So step one is finding breathing room: open your bank app and look at last week's 3 biggest buys. Once there's room, automate a transfer to the Savers Goal CD,… |  |
| c2-gen-06 | what_if | How can I fill it faster? | what_if | yes | 1.7 | Adding $50 a month takes your safety cushion from $103 to $153 a month, so it fills in about 5 months instead of about 7. Your guilt-free money stays at $171 a month, so you keep room for what you love. Automate the extra $50 so it moves on its own. |  |
| c2-gen-07 | free | Why is my safety cushion this size? | general | yes | 2.2 | Your safety cushion target is $6,993, which is 3 months of your $2,331 monthly fixed costs. That gives you real breathing room if something unexpected pops up. Right now your costs use up your income, so we'll find room first, then start filling it. FirstRate… |  |
| c2-gen-08 | why_step_one | Why is this my first move? | explain | yes | 2.0 | Your safety cushion comes first, and those first dollars make it real. Moving $20 into savings today starts your $9,555 cushion, so surprises feel manageable for your kids. At $647 a month, you'd fill it in about 15 months. FirstRate Savings is a ready-today … |  |
| c2-gen-09 | how_split | How did you split my money? | explain | yes | 2.3 | Your plan starts with $837 a month in income, from $3,348 per semester spread over 4 months. Fixed costs and debt come to $868, so nothing is split into savings or guilt-free spending yet. First we find breathing room, and tracking your biggest buys is step o… |  |
| c2-gen-10 | why_cushion | Why 3 months? | explain | yes | 1.8 | The rule is 3 months of fixed costs plus debt payments ($262 a month), but there's a $1,000 minimum, so your cushion covers about 4 months. It protects you if irregular income pauses and rent and bills still need paying. At $26 a month, it grows to full in ab… |  |
| c2-gen-11 | why_product | Why this account for me? | explain | yes | 1.9 | IRA Savings fits your family goal and you can open it today. It has no minimum to open and no monthly service charge, so it costs nothing to start. The rate is weak, 0.01% APY (the interest you earn), so think of it as a simple, low-stress home while we find … |  |
| c2-gen-12 | product_fees | Any fees I should know? | explain | yes | 1.9 | Good news: FirstRate Savings has no early-closing fee. Its $5 monthly charge is waived with a $500 average daily balance, which you already meet. It's $50 to open online or $0 in a branch, and extra transfers past 6 a month cost $15 each. The 0.01% APY is a w… |  |
| c2-gen-13 | when_unlock | When can I get the Home Ownership Program? | explain | yes | 1.9 | You're $338 away! The Home Ownership Program unlocks when your $7,986 safety cushion is full, and you've saved $7,648 so far. Your plan isn't adding to savings each month yet, so a date depends on finding breathing room first. Meanwhile, the Mortgage calculat… |  |
| c2-gen-14 | goal_gap | When does my travel fund start growing? | explain | yes | 5.2 | Your travel fund can start growing today! At $159 a month, you'd reach your $13,200 trip goal in about 7 years. Adding $61 a month from your guilt-free spending brings it to $220, which hits your 5-year goal. The Savers Goal CD could hold the money, though it… |  |
| c2-gen-15 | what_if | What if I save $50 more a month? | what_if | yes | 1.6 | Starting with $50 a month is a real first seed for your business fund! Your small business goal is $13,350, and at $50 a month that's about 22 years. Reaching it in about 5 years takes $223 a month, so finding breathing room in your spending is the big win to… |  |
| c2-gen-16 | free | What about $40 instead? | what_if | yes | 1.8 | Adding $40 a month brings your home fund to $110 a month, and your time to goal drops from about 18 years to about 11 years. Your guilt-free money stays at $929, so your fun stays funded. It's still short of the $1,250 a month a 12-month goal needs, but that'… |  |
| c2-gen-17 | why_step_one | Why is this my first move? | explain | yes | 3.0 | Right now your costs use everything coming in, so the first win is finding breathing room. Checking last week's 3 biggest buys in your bank app shows where it hides. Once there's room, your home fund and safety cushion can start growing. |  |
| c2-gen-18 | how_split | How did you split my money? | explain | yes | 2.2 | Your $1,129 a month goes four ways: $672 to fixed costs, $225 to your home fund, and $232 guilt-free, protected for the freedom you love. That covers your costs and your goal, and keeps room to enjoy life. Your safety cushion gets $0 for now, and $34 a month … |  |
| c2-gen-19 | why_cushion | Why 3 months? | explain | yes | 2.7 | Three months is the sweet spot for you because your income is irregular. If it pauses for a month or two, rent and bills are still covered. Your cushion target is $7,530, which is 3 times your $2,510 monthly fixed costs, and you've already saved $4,383 toward… |  |
| c2-gen-20 | why_product | Why this account for me? | explain | yes | 1.5 | Freestyle Checking is your everyday home base, and you qualify today. There's no monthly fee with free online statements, so your money stays yours. It also fits your everyday banking goal, and after 120 days it qualifies you for CashPlease small-dollar loans. |  |
| c2-gen-21 | product_fees | Any fees I should know? | explain | yes | 2.1 | Great news: FNB Student Checking has no monthly fee, no minimum balance, and no overdraft fees, since FNB declines items instead. It even refunds the $2.95 non-FNB ATM fee up to 4 times per cycle. Paper statements cost $3.95 per cycle, so e-statements keep th… |  |
| c2-parents-pay-rent | goal_gap | How do I close the $140 gap for my travel fund? | explain | yes | 1.8 | Your travel fund is $140 a month away from the 6-month spring break pace. The best lever is turning up your travel dial: move $140 from your $330 guilt-free money, leaving $190 for fun. A Savers Goal CD can automate it, though its 0.05% APY is weak. |  |
