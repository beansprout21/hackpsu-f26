# AI audit (cycle 5)

Generated 2026-10-25T06:58:23.195Z by `scripts/ai-audit.ts` (#121), seed 12105. Plan model `claude-sonnet-5-5`, profile model `claude-haiku-5-5`.
Sample: 25 users (3 rotating scenarios + generated users stratified by life stage, persona, surplus, FNB customer) through the real profile + plan pipeline, then 50 Ask Sprout answers across all intents. Live AI. Synthetic users only.

## Summary

- Plans: 25 built, 0 plan fallbacks, 0 profile fallbacks, 8 AI fields kept the template (guards or text budget), average plan latency 7.7 s, profile 5.4 s.
- Chats: 50 answers, 0 fallbacks (boundary and rate answers are deterministic by design), average latency 1.9 s.
- Fallback rate (plans + chats): 0.0%.
- Wall time 158 s.

### Plan flags (items affected)

| Flag | Items | Examples |
|---|---|---|
| investing/tax advice | 1 | personaDescription: "Experience Collector suits you because you chase new experiences while keeping security and growth in view, and your education goal shows that you invest in yo…" |

### Chat flags (items affected)

| Flag | Items | Examples |
|---|---|---|

## Plans

| User | Life stage | Persona | Surplus | Customer | AI | Plan s | Headline | Flags |
|---|---|---|---|---|---|---|---|---|
| c5-no-income | student | Experience Collector | no | no | yes | 7.1 | Your first step toward summer classes and a safety cushion | **investing/tax advice**: personaDescription: "Experience Collector suits you because you chase new experiences while keeping security and growth in view, and your education goal shows that you invest in yo…" |
| c5-parents-pay-rent | student | Experience Collector | yes | no | yes | 8.8 | Spring break and freedom, funded on your terms |  |
| c5-high-fixed | new_grad | Safety Builder | yes | no | yes | 7.6 | Your safety cushion and first home, one clear plan |  |
| c5-gen-00 | student | Freedom Seeker | yes | no | yes | 8.7 | Study abroad and a work car, both within reach |  |
| c5-gen-01 | new_grad | Safety Builder | no | no | yes | 6.9 | Your first step toward your own shop starts today |  |
| c5-gen-02 | young_family | Experience Collector | yes | yes | yes | 7.8 | Your trips, your safety cushion, your freedom to say yes |  |
| c5-gen-03 | student | Family First | no | yes | yes | 8.1 | First, let's find your breathing room |  |
| c5-gen-04 | new_grad | Future Builder | yes | no | yes | 9.1 | $120 a month toward your goals, starting with small business |  |
| c5-gen-05 | young_family | Simple Saver | no | no | yes | 7.4 | A calm, simple path toward your family and your home |  |
| c5-gen-06 | student | Freedom Seeker | yes | yes | yes | 7.7 | A car for work is about 7 months away |  |
| c5-gen-07 | new_grad | Safety Builder | no | yes | yes | 6.7 | A calm path to your safety cushion and shop |  |
| c5-gen-08 | young_family | Experience Collector | yes | no | yes | 9.2 | Your business, home, and travel dreams get a real plan |  |
| c5-gen-09 | student | Family First | no | no | yes | 8.7 | Your shop dream starts with a clear spending plan |  |
| c5-gen-10 | new_grad | Future Builder | yes | yes | yes | 8.2 | Your family, your freedom, your plan, all growing together |  |
| c5-gen-11 | young_family | Simple Saver | no | yes | yes | 6.9 | Your shop and family goals start with breathing room |  |
| c5-gen-12 | student | Freedom Seeker | yes | no | yes | 9.1 | Your business, your freedom, and a safety cushion |  |
| c5-gen-13 | new_grad | Safety Builder | no | no | yes | 7.6 | A calm, steady plan to find your breathing room |  |
| c5-gen-14 | young_family | Experience Collector | yes | yes | yes | 4.9 | Your family's skills fund is ready to grow |  |
| c5-gen-15 | student | Family First | no | yes | yes | 6.7 | Your kids' business dream starts with breathing room |  |
| c5-gen-16 | new_grad | Future Builder | yes | no | yes | 8.4 | Your first home and business are both on track |  |
| c5-gen-17 | young_family | Simple Saver | no | no | yes | 8.2 | A simple path to study abroad and family security |  |
| c5-gen-18 | student | Freedom Seeker | yes | yes | yes | 8.0 | Your freedom plan starts with $20 today |  |
| c5-gen-19 | new_grad | Safety Builder | no | yes | yes | 6.1 | Find your breathing room, then watch savings grow |  |
| c5-gen-20 | young_family | Experience Collector | yes | no | yes | 6.6 | Your study abroad safety cushion starts today |  |
| c5-gen-21 | student | Family First | no | no | yes | 7.4 | Find breathing room, then grow your safety cushion |  |

## Chats

| User | Intent | Question | Route | AI | s | Answer | Flags |
|---|---|---|---|---|---|---|---|
| c5-no-income | why_step_one | Why is this my first move? | explain | yes | 2.2 | Right now your costs use everything coming in, so the first win is finding breathing room. Spotting your 3 biggest buys from last week shows where it's hiding. Once you find some, your education fund and safety cushion can start growing. |  |
| c5-parents-pay-rent | how_split | How did you split my money? | explain | yes | 1.6 | Of your $600 a month, $150 covers fixed costs. $120 goes to savings: $60 to your safety cushion and $60 to travel. $330 stays guilt-free for the experiences you love, your top dial. Automate the savings so it happens on its own. |  |
| c5-high-fixed | why_cushion | Why 3 months? | explain | yes | 1.7 | Three months of rent and bills is $4,650, enough to keep you steady if a job changes or a surprise hits. You've saved $300 already, and $135 a month fills it in about 3 years. Your first milestone, 1 month covered, lands in about 10 months. |  |
| c5-gen-00 | why_product | Why this account for me? | explain | yes | 1.5 | FNB Student Checking fits your everyday banking goal, and you qualify today. It has no monthly service charge, no minimum balance, and no overdraft fees, since FNB declines items instead. Pick e-statements to skip the $3.95 paper fee. |  |
| c5-gen-01 | product_fees | Any fees I should know? | explain | yes | 2.1 | Great news: Freestyle Checking has no monthly fee when you choose free online statements, so automate that choice and keep it at $0. Paper statements run $3.95 plus $3.00 for check images. Overdrafts are $35 per item (max $140 a day), but items of $5 or less … |  |
| c5-gen-03 | goal_gap | How do I close the $353 gap for my home fund? | explain | yes | 3.0 | Great news: the $353 a month gap is closable once there's breathing room. Right now costs use up your income, so step one is opening your bank app and finding last week's 3 biggest buys. FNB's mortgage calculators are free to explore your home dream while you… |  |
| c5-gen-04 | what_if | What if I save $50 more a month? | what_if | yes | 1.8 | Adding $50 takes your business fund from $85 to $135 a month, cutting the wait from about 8 years to about 5 years. You'd still be $201 a month away from the 2-year goal, and your guilt-free spending stays healthy at $726. |  |
| c5-gen-05 | free | Is FNB the best bank for me? | general | yes | 4.1 | I can't crown any bank "best," but FNB's Freestyle Checking fits your love of simplicity: no monthly fee with online statements. Your goals aren't funded yet, so step one is finding breathing room in last week's biggest buys. Then FNB's IRA Savings (0.01% APY… |  |
| c5-gen-06 | why_step_one | Why is this my first move? | explain | yes | 2.5 | Your travel fund is your top goal, so moving $20 into it today turns your plan into real progress. It starts the $434 a month you're putting toward it. Set it to automate and the saving runs itself. |  |
| c5-gen-07 | how_split | How did you split my money? | explain | yes | 1.9 | Here's your plan: $2,325 comes in each month, and $2,478 goes to fixed costs and debt. That leaves $0 for your safety cushion, goals, and guilt-free spending for now. Your safety cushion is $62 a month away and travel is $38 a month away, so step one is findi… |  |
| c5-gen-08 | why_cushion | Why 3 months? | explain | yes | 1.6 | Three months of rent and bills is $6,417, enough to keep life steady if a job change or surprise pauses your income. You've already saved $4,296, and $245 a month fills the rest in about 9 months. FirstRate Savings is where your safety cushion grows. |  |
| c5-gen-09 | why_product | Why this account for me? | explain | yes | 2.3 | FNB Student Checking fits because you qualify today, it has no monthly fee, and it fits your budget. It also never charges overdraft fees, since FNB declines items instead. Switch to e-statements to skip the $3.95 paper charge and keep your shop goal rolling. |  |
| c5-gen-10 | product_fees | Any fees I should know? | explain | yes | 4.1 | Good news: IRA Savings has no minimum to open and no monthly service charge. The one fee to know is $50 if you later transfer your IRA funds to another institution. Withdrawing before age 59 1/2 also brings an IRS 10% penalty, so treat it as long-term money. |  |
| c5-gen-11 | when_unlock | When can I get the Home Ownership Program? | explain | yes | 4.4 | The Home Ownership Program unlocks when your $13,602 safety cushion is full. You've saved $860 so far, so $12,742 is left to grow. Right now your costs use up your income, so step one is finding breathing room. Meanwhile, FNB's mortgage calculators are free t… |  |
| c5-gen-12 | goal_gap | When does my travel fund start growing? | explain | yes | 1.8 | Your travel fund is already growing: $52 a month goes in now. To hit $12,000 on your 3-year timeline, it needs $334 a month, so you're $282 a month away. At today's pace it would take about 19 years, and turning up your guilt-free dial by $282 closes that gap. |  |
| c5-gen-13 | what_if | What if I spend $50 less on fun? | what_if | yes | 1.8 | Moving $50 a month to your family goal is a real first seed. At that pace it would take about 7 years, and you'd be $66 a month away from the $116 a month that reaches your 3-year plan. Freeing up more breathing room closes that gap faster. |  |
| c5-gen-14 | free | Can I skip the safety cushion and put everything into my top goal? | general | yes | 2.1 | Your safety cushion is the steady ground under your education goal, so I'd keep it in the plan. Right now your plan has $0 a month going to it, with a $5,208 target, so it's worth giving it a start. Your education goal is $13 a month away, and you can close t… |  |
| c5-gen-15 | why_step_one | Why is this my first move? | explain | yes | 1.6 | Right now your costs use everything coming in, so the first win is finding breathing room. Spotting last week's 3 biggest buys shows where your money goes, and it's a quick look, not a big cut. That room is what starts your business fund for your kids. |  |
| c5-gen-16 | how_split | How did you split my money? | explain | yes | 1.6 | Of your $2,099 a month, $1,515 covers fixed costs. Another $292 goes to your goals and $292 is guilt-free money for what helps you grow, since growth is your top value. Your safety cushion gets $0 for now, and it's $253 a month away from on track. |  |
| c5-gen-17 | why_cushion | Why 3 months? | explain | yes | 1.6 | Three months of rent and bills keeps you steady if income pauses, like a job change or a surprise. Your plan sets this safety cushion at $18,981, and you've already saved $1,966 toward it. Your first milestone, 1 month covered, is $6,327. |  |
| c5-gen-18 | why_product | Why this account for me? | explain | yes | 1.6 | CardGuard fits your safety cushion goal and is free and ready today. You can turn your card off or on, get real-time alerts, and set spend limits. That keeps your cushion safe while you build toward your $2,448 target. |  |
| c5-gen-19 | product_fees | Any fees I should know? | explain | yes | 1.5 | FirstRate Savings has a $5 monthly fee, waived once you keep a $500 average daily balance. It's $50 to open online or $0 in a branch, and extra transfers past 6 a month cost $15 each. There's no early-closing fee, and its 0.01% APY is a weak rate. |  |
| c5-gen-21 | goal_gap | How do I close the $261 gap for my safety cushion? | explain | yes | 1.9 | Your safety cushion is $261 a month away, and right now your income is fully used by fixed costs. Start with stepOne: open your bank app and find last week's 3 biggest buys, since that's where your breathing room hides. Once you free some up, automate it into… |  |
| c5-no-income | what_if | What if I save $50 more a month? | what_if | yes | 1.8 | Adding $50 a month is a real start: your education fund would reach $1,000 in about 20 months. Your 12-month goal needs $84 a month, so you'd be $34 a month away. Automate the $50, then we can find the extra $34. |  |
| c5-parents-pay-rent | free | What if I save $500 less a month? | what_if | yes | 1.6 | Saving $500 less would take your travel fund from $60 a month to $0, so spring break would stay off track, with a $200 a month gap. Your guilt-free spending would still be $330 a month. Automating even $60 keeps the dream growing. |  |
| c5-high-fixed | why_step_one | Why is this my first move? | explain | yes | 1.7 | Your home fund is your top goal, and money moved today turns the plan into progress. Moving $20 into savings now starts your $4,650 safety cushion, and automating it keeps it growing, so your $90 a month toward your first home can keep rolling. |  |
| c5-gen-00 | how_split | How did you split my money? | explain | yes | 1.7 | Of your $2,380 a month, $1,307 covers fixed costs. Then $476 goes to your goals, and $597 stays guilt-free for the freedom you love. That's 20% saving and 25% spending on what matters, with the rest left over for flexibility. |  |
| c5-gen-01 | why_cushion | Why 3 months? | explain | yes | 1.9 | Three months of rent and bills is $6,141, a cushion for a job change or surprise. It's based on your $2,047 in fixed costs and debt payments each month. You've already saved $1,100 toward it, a great start on feeling secure while you build your shop. |  |
| c5-gen-02 | why_product | Why this account for me? | explain | yes | 1.6 | CardGuard is free and fits your travel goal, since real-time alerts keep your trip money safe. You can also set spend limits by location or merchant type, so your trips stay on plan. It's available to you today, with no cost. |  |
| c5-gen-03 | product_fees | Any fees I should know? | explain | yes | 1.6 | Good news: FNB's Mortgage calculators are free, so there's no fee to explore your first home goal. They're a website tool, with the cost listed as free as of Oct 24, 2026. Try the affordability and down payment comparisons whenever you're ready. |  |
| c5-gen-05 | goal_gap | How do I close the $200 gap for my family fund? | explain | yes | 1.7 | Your family fund is $200 a month away, and right now your costs use up all your income, so that's the place to start. Automate any breathing room you find into that fund. Step one: open your bank app and review last week's 3 biggest buys. IRA Savings is a sim… |  |
| c5-gen-06 | what_if | Can I reach my travel fund sooner? | what_if | yes | 1.5 | Yes! Adding $50 a month takes your travel fund from $434 to $484, so you'd reach it in about 6 months instead of about 7. Your guilt-free spending stays healthy at $707 a month, so you keep room for what you love. Automate the extra $50 so it happens. |  |
| c5-gen-07 | free | Can you open the account for me? | general | yes | 1.4 | I'm a prototype coach, so I can't open accounts myself. When you're ready, FNB can set it up with you. Great first pick is CardGuard: it's free, with real-time alerts to keep your safety cushion plan calm. |  |
| c5-gen-08 | why_step_one | Why is this my first move? | explain | yes | 1.7 | Your business fund is your top goal, and freedom is one of your core values. Moving $20 today turns the plan into progress right away. Then $148 a month keeps it growing automatically. Automate it, and the habit builds itself. |  |
| c5-gen-09 | how_split | How did you split my money? | explain | yes | 1.7 | Right now your costs use up all of your $2,428 a month: fixed costs and debt come to $2,534, so nothing is set aside yet for your safety cushion, goals, or guilt-free spending. That's your starting point, not a verdict. Finding breathing room comes first, and… |  |
| c5-gen-10 | why_cushion | Why 3 months? | explain | yes | 1.4 | Three months of rent and bills is $2,988, a cushion that keeps you steady if a job changes or a surprise hits. You've already saved $1,967, and $112 a month fills it in about 10 months. Your first milestone is one month covered at $996. |  |
| c5-gen-11 | why_product | Why this account for me? | explain | yes | 1.5 | The Financial Insights Learning Center is free and ready today, and it fits your education goal of starting your own shop. Its self-paced modules on budgeting, credit scores, and banking basics help you plant good money habits before spending a dollar. |  |
| c5-gen-12 | product_fees | Any fees I should know? | explain | yes | 1.5 | Good news: FNB Student Checking has no monthly fee, no minimum balance, and no overdraft fees, since FNB declines items instead. Paper statements cost $3.95 per cycle, but e-statements are free. It also refunds FNB's $2.95 non-FNB ATM fee up to 4 times per st… |  |
| c5-gen-13 | when_unlock | When can I get the SmartCash card? | explain | yes | 1.6 | The FNB SmartCash Credit Card unlocks when your credit range reaches fair, so it's tied to your credit progress rather than a date. It has no annual fee and 2% cash back. Meanwhile, IRA Savings gives your family goal a home today. |  |
| c5-gen-14 | goal_gap | How do I close the $13 gap for my education fund? | explain | yes | 1.8 | Closing your education fund gap is a small step: move $13 a month from your $833 guilt-free money, leaving $820 to enjoy. Automate it so it happens on its own. Or give it more time, or aim for $7,704, which you can reach at your current pace. |  |
| c5-gen-15 | what_if | What if I save $50 more a month? | what_if | yes | 1.8 | Adding $50 a month toward your small business fund is a real start, and it gets you within $37 a month of the $87 needed to reach $10,350. At $50 a month, that goal would take about 17 years. Your costs use up your income right now, so first we find some brea… |  |
| c5-gen-16 | free | Can I put my savings in index funds or crypto? | boundary | **no** | 0.0 | When you're ready for that, an FNB advisor can help. |  |
| c5-gen-17 | why_step_one | Why is this my first move? | explain | yes | 1.6 | Right now your costs use up everything coming in, so the first win is finding breathing room. Checking last week's 3 biggest buys shows where it hides. Once there's room, your travel fund and safety cushion can start to sprout. |  |
| c5-gen-18 | how_split | How did you split my money? | explain | yes | 1.9 | Your $1,103 a month covers $816 of fixed costs first. The $287 left splits three ways: $71 to your safety cushion, $72 to your goals, and $144 guilt-free, protected for the freedom you love. Automate those transfers and it runs itself. |  |
| c5-gen-19 | why_cushion | Why 3 months? | explain | yes | 2.0 | Three months of rent and bills keeps you steady if income pauses, like a job change or a surprise. Your monthly fixed costs and debt payments are $2,054, so 3 months is a $6,162 safety cushion. You've saved $4,465 already, which covers your first month and th… |  |
| c5-gen-20 | why_product | Why this account for me? | explain | yes | 1.7 | Workplace First Checking fits your everyday banking goal, and you can open it today with no minimum opening balance. The $5 monthly charge is waived with one direct, mobile, ATM or branch deposit per cycle, so automate a deposit and it costs nothing. It also … |  |
| c5-gen-21 | product_fees | Any fees I should know? | explain | yes | 1.7 | Good news: FNB Student Checking has no monthly fee, no minimum balance, and no overdraft fees, since FNB declines items instead. It even refunds FNB's $2.95 non-FNB ATM fee up to 4 times a cycle. Paper statements cost $3.95 a cycle, so switch to e-statements … |  |
| c5-parents-pay-rent | goal_gap | How do I close the $140 gap for my travel fund? | explain | yes | 1.9 | Your travel fund is $140 a month away, and you've got a few ways to close it. Turn up your travel dial by moving $140 from guilt-free spending, which leaves you $190 a month. Or give it more time, about 20 months, or aim for a smaller $360 target. |  |
| c5-high-fixed | what_if | How can I fill it faster? | what_if | yes | 1.6 | Adding $50 a month takes your safety cushion from $135 to $185 a month, so it fills in about 2 years instead of about 3. You'd still have $175 a month of guilt-free spending. Automate the transfer, and FirstRate Savings is a safe home for it. |  |
| c5-gen-00 | free | What if I save $25 more a month? | what_if | yes | 1.5 | Moving your home fund from $336 to $361 a month is a lovely step, and your guilt-free spending stays healthy at $572. At that pace your first home still takes about 3 years, and you'd be $306 a month away from the 18-month goal. |  |
