# AI audit (cycle 4)

Generated 2026-10-25T06:53:11.177Z by `scripts/ai-audit.ts` (#121), seed 12104. Plan model `claude-sonnet-5-5`, profile model `claude-haiku-5-5`.
Sample: 25 users (3 rotating scenarios + generated users stratified by life stage, persona, surplus, FNB customer) through the real profile + plan pipeline, then 50 Ask Sprout answers across all intents. Live AI. Synthetic users only.

## Summary

- Plans: 25 built, 0 plan fallbacks, 0 profile fallbacks, 6 AI fields kept the template (guards or text budget), average plan latency 7.8 s, profile 4.7 s.
- Chats: 50 answers, 0 fallbacks (boundary and rate answers are deterministic by design), average latency 2.3 s.
- Fallback rate (plans + chats): 0.0%.
- Wall time 172 s.

### Plan flags (items affected)

| Flag | Items | Examples |
|---|---|---|
| contradiction: on track vs gap | 1 | sproutSays says on track, engine has a gap: "Your first home is $4 a month away, and your small business goal is on track." |

### Chat flags (items affected)

| Flag | Items | Examples |
|---|---|---|

## Plans

| User | Life stage | Persona | Surplus | Customer | AI | Plan s | Headline | Flags |
|---|---|---|---|---|---|---|---|---|
| c4-maya | student | Experience Collector | yes | no | yes | 10.1 | Japan, your safety cushion, and a home of your own |  |
| c4-jordan | young_family | Safety Builder | yes | no | yes | 7.1 | A safe, settled home is within reach |  |
| c4-maya-opposite | student | Safety Builder | yes | no | yes | 10.4 | Japan, your own place, and a safety cushion |  |
| c4-gen-00 | student | Freedom Seeker | yes | no | yes | 9.6 | Your freedom plan starts with $20 today |  |
| c4-gen-01 | new_grad | Safety Builder | no | no | yes | 5.5 | Find your breathing room, then build your own shop |  |
| c4-gen-02 | young_family | Experience Collector | yes | yes | yes | 6.4 | Your safety cushion and shop fund start today |  |
| c4-gen-03 | student | Family First | no | yes | yes | 6.3 | A clear first step toward a calmer money life |  |
| c4-gen-04 | new_grad | Future Builder | yes | no | yes | 8.3 | Your first home and a work car are in reach | **contradiction: on track vs gap**: sproutSays says on track, engine has a gap: "Your first home is $4 a month away, and your small business goal is on track." |
| c4-gen-05 | young_family | Simple Saver | no | no | yes | 7.3 | Your simple plan starts with breathing room |  |
| c4-gen-06 | student | Freedom Seeker | yes | yes | yes | 9.6 | A car for work, a safety cushion, and calm money |  |
| c4-gen-07 | new_grad | Safety Builder | no | yes | yes | 7.5 | Find your breathing room, then watch your goals grow |  |
| c4-gen-08 | young_family | Experience Collector | yes | no | yes | 7.1 | Your family home goal is on track and moving |  |
| c4-gen-09 | student | Family First | no | no | yes | 7.1 | Your family's safety net starts with one look |  |
| c4-gen-10 | new_grad | Future Builder | yes | yes | yes | 7.6 | Your shop and your own home, mapped out |  |
| c4-gen-11 | young_family | Simple Saver | no | yes | yes | 5.5 | Find your breathing room, then travel together |  |
| c4-gen-12 | student | Freedom Seeker | yes | no | yes | 6.7 | Your study abroad dream has a real plan |  |
| c4-gen-13 | new_grad | Safety Builder | no | no | yes | 7.3 | Your safety cushion starts with one quick look |  |
| c4-gen-14 | young_family | Experience Collector | yes | yes | yes | 8.4 | Your first home is closer than you think |  |
| c4-gen-15 | student | Family First | no | yes | yes | 8.3 | Your shop dream starts with finding breathing room |  |
| c4-gen-16 | new_grad | Future Builder | yes | no | yes | 8.3 | Your shop dream starts with a $20 move |  |
| c4-gen-17 | young_family | Simple Saver | no | no | yes | 6.4 | A steady plan for your family, car, and business |  |
| c4-gen-18 | student | Freedom Seeker | yes | yes | yes | 9.2 | Your safety cushion, shop, and home start here |  |
| c4-gen-19 | new_grad | Safety Builder | no | yes | yes | 7.4 | A steady home base starts with one small look |  |
| c4-gen-20 | young_family | Experience Collector | yes | no | yes | 6.9 | Your calm, secure home is $706 a month away |  |
| c4-gen-21 | student | Family First | no | no | yes | 9.9 | Your home, your trip, your shop: a plan to start |  |

## Chats

| User | Intent | Question | Route | AI | s | Answer | Flags |
|---|---|---|---|---|---|---|---|
| c4-maya | why_step_one | Why is this my first move? | explain | yes | 2.0 | Travel is your top goal, so money moved today turns Japan from a wish into progress. Your $20 starts the $91 a month plan. Automate it so it grows on its own, like a seed that doesn't need daily watering. |  |
| c4-jordan | how_split | How did you split my money? | explain | yes | 1.6 | Here's how your $2,400 a month grows: $1,650 covers fixed costs, $225 builds your safety cushion, and $150 goes to your home fund. The remaining $375 is guilt-free money, protected for what makes you feel safe. |  |
| c4-maya-opposite | why_cushion | Why 3 months? | explain | yes | 1.8 | Because your income comes and goes, 3 months of rent and bills ($650 a month) gives you a steady cushion if money pauses. That's a $1,950 safety cushion, and you've already saved $400. At $135 a month, it's full in about 12 months, with 1 month covered in abo… |  |
| c4-gen-00 | why_product | Why this account for me? | explain | yes | 1.5 | FNB Student Checking fits your everyday banking goal, and you qualify for it today. There's no monthly fee, no minimum balance, and no overdraft fees, so your plan stays steady. Choose e-statements to skip the $3.95 paper fee. |  |
| c4-gen-01 | product_fees | Any fees I should know? | explain | yes | 1.6 | Good news: Freestyle Checking has no monthly fee when you pick free online statements. Paper statements cost $3.95 plus $3.00 for check images. Overdrafts are $35 per item (max $140 a day), but items of $5 or less are free of that fee, so automating a small b… |  |
| c4-gen-03 | goal_gap | How do I close the $95 gap for my education fund? | explain | yes | 1.7 | Your education fund is $95 a month away, and the first step is finding breathing room. Open your bank app and look at last week's 3 biggest buys; that's where it hides. The free Financial Insights Learning Center has a Creating a Budget lesson to guide you. O… |  |
| c4-gen-04 | what_if | How can I fill it faster? | what_if | yes | 2.2 | Adding $50 a month takes your safety cushion from $103 to $153 a month, so it fills in about 15 months instead of about 22. Your guilt-free spending still stays at $400 a month. Automate that extra $50 so it moves on its own. FirstRate Savings is where your c… |  |
| c4-gen-05 | free | Can I put my savings in index funds or crypto? | boundary | **no** | 0.0 | When you're ready for that, an FNB advisor can help. |  |
| c4-gen-06 | why_step_one | Why is this my first move? | explain | yes | 2.1 | Your home fund is your top goal, and money moved today turns the plan into progress. Moving $20 now starts it, and you can automate the $176 a month so it keeps growing on its own. |  |
| c4-gen-07 | how_split | How did you split my money? | explain | yes | 3.0 | Great question! Your income averages $302 a month, and your fixed costs run $348, so right now there's no room left to assign to savings or guilt-free spending. That's a $46 gap, and finding breathing room is step one. Once it opens up, your safety cushion an… |  |
| c4-gen-08 | why_cushion | Why 3 months? | explain | yes | 1.8 | Three months is the sweet spot for steady income: if work pauses, your rent and bills stay covered. For you, that's a $6,027 safety cushion. Setting aside $170 a month gets one month covered in about 12 months, and the full cushion in about 3 years. |  |
| c4-gen-09 | why_product | Why this account for me? | explain | yes | 2.8 | FNB Student Checking is your everyday home base, ready right away, and it fits your budget with no monthly fee or minimum balance. It also never charges overdraft fees, since FNB declines items instead. Switch to e-statements to skip the $3.95 paper charge. |  |
| c4-gen-10 | product_fees | Any fees I should know? | explain | yes | 1.7 | FirstRate Business Savings has a $5 monthly charge, waived when your average daily balance stays at $500 or more. Your $152 a month, automated, gets you there fast. There's no minimum to open in a branch. Check the current rate with FNB. |  |
| c4-gen-12 | goal_gap | How do I close the $388 gap for my education fund? | explain | yes | 2.6 | Closing it all at once is a stretch, so pick a lever. Give it more time: at $129 a month, about 6 years gets you there. Or aim for a smaller target of $2,322 you can reach on your current pace. Automating your $129 keeps it growing either way. |  |
| c4-gen-13 | what_if | What if I save $50 more a month? | what_if | yes | 2.6 | An extra $50 a month builds your safety cushion to $1,887 in about 3 years. You'd be $3 a month short of the $53 pace for your study abroad timeline, so it's a strong start. Automate the transfer so it happens without willpower. |  |
| c4-gen-14 | free | What if I save $25 more a month? | what_if | yes | 2.3 | Adding $25 takes your home fund to $289 a month and trims the timeline from about 5 years to about 4 years. It's still $102 a month away from fully on track. Your guilt-free spending stays healthy at $1,517, so your experiences stay funded. Automate the extra… |  |
| c4-gen-15 | why_step_one | Why is this my first move? | explain | yes | 1.9 | Right now your costs use everything coming in, so finding breathing room comes first. Your last week's 3 biggest buys show where that room might be hiding. Once you spot it, your education fund and your shop goal have room to start growing. |  |
| c4-gen-16 | how_split | How did you split my money? | explain | yes | 1.7 | Your $1,849 a month first covers $784 of fixed costs. Then $184 (10%) is automated into savings: $92 to your safety cushion and $92 to your goals. That leaves $697 (38%) guilt-free, protected for what helps you grow. |  |
| c4-gen-17 | why_cushion | Why 3 months? | explain | yes | 2.0 | Three months is the cushion rule: 3 times your fixed costs and debt payments, which is $17,844 for you. If a job change or surprise pauses income, that keeps rent and bills covered while you steady things. Your first milestone is 1 month covered, $5,948. |  |
| c4-gen-18 | why_product | Why this account for me? | explain | yes | 1.9 | CardGuard fits your safety cushion goal for your kids, and it's free. You can turn the card off or on, get real-time alerts, and use Spend Insights to see where your money goes. It keeps spending simple while you build toward your $1,386 cushion. |  |
| c4-gen-19 | product_fees | Any fees I should know? | explain | yes | 1.8 | Good news: the Mortgage calculators are free, a tool on FNB's website with no fees (as of Oct 24, 2026). Use the affordability and down payment tools today to see what a first home could cost, and feel a little less stressed. |  |
| c4-gen-20 | when_unlock | When can I get the Home Ownership Program? | explain | yes | 2.3 | The Home Ownership Program unlocks when your $9,714 safety cushion is full. At $294 a month, that's about 3 years away, and you're starting from $0 today. Meanwhile, the Mortgage calculators are free to try right now, so you can picture your path to your firs… |  |
| c4-gen-21 | goal_gap | How do I close the $109 gap for my home fund? | explain | yes | 3.8 | Your home fund is $109 a month away. Right now your costs use up your income, so step one is finding breathing room: open your bank app and look at last week's 3 biggest buys. The home fund unlocks when you have a full-time job and your $5,418 safety cushion … |  |
| c4-maya | what_if | How can I fill it faster? | what_if | yes | 1.3 | Automating $50 more a month lifts your safety cushion to $163 a month. That fills it in about 10 months instead of about 14, and your guilt-free money stays at $207, still above the 10% mark. |  |
| c4-jordan | free | Should I get a credit card now? | general | yes | 1.9 | Great question. Right now your plan puts $225 a month into your safety cushion and $150 toward your home fund, and no credit card product is in your FNB matches. Building that cushion first is the steadiest base. When you're ready to explore cards, an FNB ban… |  |
| c4-maya-opposite | why_step_one | Why is this my first move? | explain | yes | 2.0 | Money moved today turns your plan into progress, and your Japan travel fund is your top goal. Moving $20 starts your $1,950 safety cushion, so your $73 a month for Japan has solid ground under it. Automate it and the habit runs itself. |  |
| c4-gen-00 | how_split | How did you split my money? | explain | yes | 1.7 | Your plan starts from $571 a month. Fixed costs and debt take $373, and the $198 left splits three ways: $49 to your safety cushion, $50 to goals, and $99 guilt-free for the freedom you love. That guilt-free 17% is protected, so enjoy it. |  |
| c4-gen-01 | why_cushion | Why 3 months? | explain | yes | 4.0 | Three months of fixed costs and debt payments is $3,429, enough to keep rent and bills covered if income pauses, like during a job change. You've saved $5,897, so your safety cushion is already fully planted. |  |
| c4-gen-02 | why_product | Why this account for me? | explain | yes | 1.4 | FirstRate Savings is a calm home for your safety cushion, and you qualify today. Your $500+ balance already waives the $5 monthly fee. Its rate is 0.01% APY, which is weak, so Flex CD is your next move. |  |
| c4-gen-03 | product_fees | Any fees I should know? | explain | yes | 1.9 | Good news: the Financial Insights Learning Center is free, so there's no fee to worry about. Start with Creating a Budget to find your breathing room and ease that money stress while you work toward your education goal. |  |
| c4-gen-04 | when_unlock | When can I get the Home Ownership Program? | explain | yes | 1.6 | The Home Ownership Program unlocks when your $3,639 safety cushion is full, about 22 months from now. You've saved $1,423 so far, and $103 a month fills the remaining $2,216. Meanwhile, the Mortgage calculators are free and ready today to explore what a home … |  |
| c4-gen-05 | goal_gap | How do I close the $137 gap for my education fund? | explain | yes | 3.0 | Your education fund is $137 a month away, and right now your costs use up your income. So step one is finding breathing room: open your bank app and look at last week's 3 biggest buys. Once there's room, automate that $137. FNB's free Learning Center can help… |  |
| c4-gen-06 | what_if | How can I fill it faster? | what_if | yes | 1.6 | Adding $50 a month lifts your safety cushion to $226 a month, so it fills in about 10 months instead of about 13. You'd still keep $633 a month for guilt-free spending. Automate the transfer so it happens on its own, like a plant on a drip line. |  |
| c4-gen-07 | free | Why is my safety cushion this size? | general | yes | 1.7 | Your safety cushion target is $1,044, which is about three months of your $348 fixed costs. That's a steady size for feeling secure, and it matches what you value most. Right now your costs use up your income, so step one is finding breathing room to start gr… |  |
| c4-gen-08 | why_step_one | Why is this my first move? | explain | yes | 2.2 | Your family fund is your top goal, and money moved today turns the plan into progress. Moving $20 now starts the $171 a month you're putting toward a home of your own. Automate it so it grows on its own, like a seed that's already planted. |  |
| c4-gen-09 | how_split | How did you split my money? | explain | yes | 2.5 | Your plan starts with income of $1,150 a month, from $4,600 per semester spread over 4 months. Fixed costs and debt take $1,392, so there's nothing to split into savings or guilt-free spending yet. Finding your breathing room comes first, and Student Checking… |  |
| c4-gen-10 | why_cushion | Why 3 months? | explain | yes | 3.0 | Three months of rent and bills is $3,156, so a job change or surprise won't knock you over. You've saved $5,294, so your safety cushion is already full. Nicely grown! |  |
| c4-gen-11 | why_product | Why this account for me? | explain | yes | 2.3 | CardGuard is free and fits your travel goal, so it's a gentle first step. Real-time alerts and Spend Insights show where money goes, which helps find your $115 a month for travel. You can start with it today. |  |
| c4-gen-12 | product_fees | Any fees I should know? | explain | yes | 5.0 | Good news: FNB Student Checking has no monthly fee, no minimum balance, and no overdraft fees, since FNB declines items instead. It even refunds FNB's $2.95 non-FNB ATM fee up to 4 times per cycle. Paper statements cost $3.95 a cycle, so choose e-statements t… |  |
| c4-gen-14 | goal_gap | How do I close the $127 gap for my home fund? | explain | yes | 3.5 | Your home fund is $127 a month away from on track, and you've got three paths. Turning up that dial by $127 leaves $1,415 for guilt-free fun. Or give it more time: about 5 years at your current pace. Or aim for a smaller target of $9,504. |  |
| c4-gen-15 | what_if | What if I save $50 more a month? | what_if | yes | 2.5 | Adding $50 a month toward your education fund is a great seed to plant. At that pace you'd reach your $11,150 goal in about 19 years, and you'd still be $570 a month away from your 18-month pace. First, let's find breathing room in your budget; automate that … |  |
| c4-gen-16 | free | What about $40 instead? | what_if | yes | 2.8 | Adding $40 lifts your safety cushion to $132 a month and shortens the wait to about 18 months. It's $64 a month away from your 12-month goal, and your guilt-free spending stays healthy at $657. Automate it so it grows quietly. |  |
| c4-gen-17 | why_step_one | Why is this my first move? | explain | yes | 2.4 | Right now your costs use everything coming in, so the first win is finding breathing room. Spotting last week's 3 biggest buys shows where it hides, and a big find beats many small cuts. Once there's room, your safety cushion can start growing. |  |
| c4-gen-18 | how_split | How did you split my money? | explain | yes | 2.5 | Your $1,269 a month splits four ways: $462 for fixed costs, $126 for your safety cushion, $127 for goals, and $554 guilt-free for the freedom you love. That puts 20% into savings and protects 44% for fun. Automate the savings so it grows on its own. |  |
| c4-gen-19 | why_cushion | Why 3 months? | explain | yes | 2.7 | Three months of rent and bills is $3,150, so a job change or surprise won't knock you off your feet. Your first milestone is 1 month covered at $1,050, a solid root to start growing from. |  |
| c4-gen-20 | why_product | Why this account for me? | explain | yes | 2.0 | Freestyle Checking is your everyday home base, and you can open it today. It fits your everyday banking goal and, with free online statements, has no monthly fee. Paper statements cost $3.95 plus $3.00 for check images, so going online keeps it free. |  |
| c4-gen-21 | product_fees | Any fees I should know? | explain | yes | 2.9 | Good news: FNB Student Checking has no monthly fee, no minimum balance, and no overdraft fees, since FNB declines or returns items instead. The one cost to know is paper statements at $3.95 per cycle, and e-statements make that free. It also refunds FNB's $2.… |  |
| c4-maya | when_unlock | When can I get the SmartSecured card? | explain | yes | 1.6 | The SmartSecured card unlocks when your savings reach $1,150, or when your first paycheck arrives. You've saved $400 and you're $750 away, about 7 months at $113 a month. Meanwhile, the free Credit Center lets you peek at your score today. |  |
| c4-jordan | goal_gap | How do I close the $100 gap for my home fund? | explain | yes | 5.8 | Your home fund is $100 a month away, and the quickest fix is turning up your guilt-free dial: moving $100 there leaves you $275 a month for fun. Our Mortgage calculators are free and show what that extra $100 does for your home goal. If you'd rather keep your… |  |
| c4-maya-opposite | what_if | How can I fill it faster? | what_if | yes | 2.2 | Adding $50 a month takes your safety cushion from $135 to $185 a month, so it fills in about 9 months instead of about 12. Your guilt-free spending stays healthy at $207. Automate the extra $50 so it grows on its own, in FirstRate Savings. |  |
