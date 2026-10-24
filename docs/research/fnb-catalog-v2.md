# FNB Product Catalog v2 (First National Bank / F.N.B. Corporation)

**Verified:** 2026-10-24.

**Scope:** consumer and small-business products, programs and tools on fnb-online.com that matter to Waypoint's users: college students first, young families second.

**Companion data file:** `fnb-catalog-v2.json` (75 entries, matches the `Product` type in `src/types/index.ts`).

## How to read this file

- **Facts only from fnb-online.com.** Every fact comes from an fnb-online.com page or an official FNB PDF linked from one. "Not published" means FNB did not state it anywhere I could find.
- **Stage hint.** Each entry says when the product fits a typical college student with little or no steady income:
  - **now**: usable today.
  - **next**: once a stated condition is met.
  - **later**: after graduation, a steady income, or a home purchase.
- **Goal tags.** Each entry uses tags from this set only: first_home, emergency_fund, travel, small_business, education, family, credit_building, everyday_banking.

## Where the rates come from

FNB product pages hide rates behind a ZIP-code box. That box calls FNB's own endpoint: `fnb-online.com/fnbapi/RegionalRates/GetAllRegionRatesDetails`.

- I queried it for ZIP 16802 (State College, PA).
- Deposit rates were identical for 15222 (Pittsburgh) and 20852 (Rockville, MD).
- The human-facing pages are:
  - Deposits: https://www.fnb-online.com/personal/checking-savings/regional-rates
  - Loans: https://www.fnb-online.com/personal/loans-mortgages/regional-rates
- Every table is stamped "Accurate as of 10/24/2026".
- **Mortgage rates are not in this feed**, so all mortgage entries say "Check current rate with FNB".

## Key fee source (new in v2)

**FNB Consumer Fee Schedule, effective May 4, 2026.**
https://www.fnb-online.com/-/media/fnbonline/files/feature/applicationdocuments/consumer-fee-schedule.pdf

| Fee | Amount |
|---|---|
| Overdraft fee (paid item) | $35.00 per item |
| Returned item (NSF) fee | $29.00 per item |
| Daily cap, overdraft + returned item | $140 per business day |
| Overdraft or return on items of $5.00 or less | No fee |
| Everyday debit card and ATM overdrafts | Declined at no cost unless you opt in |
| Overdraft protection transfer | $10.00 per transfer (free on Premierstyle; not available on eStyle or Student Checking) |
| Non-FNB ATM ("Foreign ATM") fee | $2.95 each (Student Checking: 4 refunded per cycle; free for Premierstyle and Workplace) |
| FNB ATM | No charge |
| Paper statements | $3.95 per cycle (Freestyle, Student, HSA, Workplace); $2.00 (eStyle) |
| Check images | $3.00 per cycle (Freestyle, HSA, Workplace) |
| Early account closing (within 180 days) | $50 (no charge for eStyle, FirstRate Savings, IRA Savings) |
| Dormant account | $10 per month after 24 months of inactivity (not charged to savings holders under 18) |
| Excess savings or money market withdrawals | $15 per transaction over 6 |
| Stop payment | $37 at a branch; $10 online |
| External transfer, standard (3-day) | $0.50 each; free for Student Checking |
| External transfer, next-day | $1.00 |
| Zelle send or request | No charge |
| Mobile deposit, CardGuard, mobile alerts | No charge |
| Expedited bill pay | $4.95 same-day ACH; $14.95 overnight check |
| Incoming wire | $22 (Student Checking: 1 free per cycle; Premierstyle: 2 free) |
| Outgoing domestic wire | $30 |
| Outgoing international wire | $50 |
| Debit card replacement | $10; $50 for expedited shipping |

An older July 1, 2024 schedule is also hosted at `/-/media/fnbonline/files/feature/cra/2023/consumer-fee-schedule.pdf`. It lists an "eStyle Plus Account" and only 2 ATM refunds for Student Checking. The May 2026 schedule supersedes it.

**Business Fee Schedule, effective May 1, 2025.**
https://www.fnb-online.com/-/media/fnbonline/files/feature/applicationdocuments/business/business-fee-schedule.pdf

---

## 1. Checking

### Student Checking (`student-checking`)
- **For:** high school, trade school, undergraduate and graduate students.
  - The student must be the applicant. Under 18s open jointly with a parent or guardian.
  - Domestic students need ID plus their school name.
  - International students: see "International Student Banking" below.
- **Key terms:**
  - No monthly service charge and no minimum balance.
  - No overdraft fees: FNB declines or returns items.
  - Refunds 4 FNB foreign-ATM fees ($2.95 each) per statement cycle.
  - 1 free incoming wire per cycle.
  - Free standard external transfers.
  - Paper statements cost $3.95 per cycle; e-statements are free.
  - Includes CardGuard, Zelle, mobile deposit, Payment Switch, Credit Center and biometric login.
  - Debit card arrives in 7–10 business days.
- **Minimum opening deposit:** not published.
- **Interest:** none. The comparison chart shows no interest.
- **Qualifies for:**
  - The FirstRate Savings 3.00% promo (with direct deposit).
  - **Not** eligible for CashPlease.
- **Goals:** everyday_banking, education, credit_building
- **Stage:** **now.** Open this first.
- **Sources:**
  - https://www.fnb-online.com/personal/checking-savings/checking/student-checking
  - https://www.fnb-online.com/personal/checking-savings/checking/compare
  - the Consumer Fee Schedule

### eStyle Account (`estyle-checking`)
- **For:** anyone with a valid ID. Bank On certified.
- **Key terms:**
  - $5 monthly charge, waived with 1 deposit or 5 customer-initiated transactions per cycle.
  - No overdraft fees and no paper checks.
  - Accepts RTP/FedNow instant payments.
  - No early-closing fee.
  - Paper statements cost $2.
  - Overdraft protection transfers are not available.
- **Opening deposit:** $25 online; $0 in a branch.
- **Goals:** everyday_banking, credit_building
- **Stage:** **now.** This is the alternative for non-students or anyone past Student Checking eligibility.
- **Sources:**
  - https://www.fnb-online.com/personal/checking-savings/checking/estyle-checking
  - the fee schedule

### Freestyle Checking (`freestyle-checking`)
- **For:** anyone who wants paper checks and no monthly fee.
- **Key terms:**
  - No monthly fee with online statements.
  - Paper statements cost $3.95 and check images $3.00 per cycle.
  - Overdraft fee $35, NSF $29, $140 daily cap.
  - Unlimited checks.
  - About 1,800 FNB ATMs.
- **Opening deposit:** $50 online; $0 in a branch.
- **Goals:** everyday_banking, family
- **Stage:** **next.** Switch to it after graduation; it is the cheapest account that makes you eligible for CashPlease.
- **Sources:**
  - https://www.fnb-online.com/personal/checking-savings/checking/freestyle-checking
  - the fee schedule

### Lifestyle Checking (`lifestyle-checking`)
- **Key terms:**
  - $10 monthly charge, or $9 with online statements.
  - Waived with a $1,000 average daily balance or $10,000 combined relationship balance.
  - Interest on balances of $2,500 or more.
  - Free 3x5 safe deposit box and first order of checks.
- **Rate:** 0.00% APY under $2,500; 0.01% from $2,500 up (as of 10/24/2026).
- **Opening deposit:** $50 online; $0 in a branch.
- **Goals:** everyday_banking, family
- **Stage:** **later.** Unlocks once you keep a $1,000+ balance.
- **Sources:**
  - https://www.fnb-online.com/personal/checking-savings/checking/lifestyle-checking
  - regional rates
  - fee schedule

### Premierstyle Checking (`premierstyle-checking`)
- **Key terms:**
  - $25 monthly charge, waived with a $7,500 daily balance or $25,000 combined balance.
  - Interest on balances of $1,000 or more.
  - No FNB foreign-ATM fee, plus up to $15 per statement refunded for other banks' ATM fees.
  - 2 free incoming wires per cycle.
  - Free overdraft-protection transfers.
- **Rate:** 0.00% under $1,000; 0.01% from $1,000 up (as of 10/24/2026).
- **Opening deposit:** $50 online; $0 in a branch.
- **Goals:** everyday_banking, family
- **Stage:** **later.**
- **Sources:**
  - https://www.fnb-online.com/personal/checking-savings/checking/premierstyle-checking
  - regional rates
  - fee schedule

### Workplace First Checking (`workplace-first-checking`) — NEW
- **For:** employees of employers enrolled in FNB Workplace Banking. Applying online requires an employer code. Penn State has a dedicated Workplace Banking page.
- **Key terms:**
  - $5 monthly charge, waived with 1 direct, mobile, ATM or branch deposit per cycle.
  - No minimum opening balance.
  - No FNB foreign-ATM fee, plus up to $10 per cycle refunded for other banks' ATM fees.
  - 0.375% discount on new installment loans with autopay.
  - Free 3x5 safe deposit box, or a $30 credit toward a larger one.
  - HELOC LockOption.
- **Goals:** everyday_banking, family
- **Stage:** **next.** Available if your first employer (or a campus job at an enrolled employer) participates. Whether PSU student workers qualify is not published.
- **Sources:**
  - https://www.fnb-online.com/personal/checking-savings/checking/workplace-banking
  - https://www.fnb-online.com/landing/psu-workplace

### Up to $600 Checking Promotion (`checking-bonus-600-oct26`) — NEW
- **For:** new customers who open Lifestyle or Premierstyle **in a branch** at about 28 listed "de novo" branches between Oct 5 and Dec 31, 2026, using code Q4MAIL600.
  - The branches are in Pittsburgh, NC, SC, MD/DC, VA and OH. None are in State College.
- **Key terms:**
  - $150 per 90 days, up to $600 over 12 months.
  - Requires $2,500 in qualifying direct deposits every 90 days.
  - One per household.
  - $50 fee if the account is closed within 180 days.
  - The reward is reported on Form 1099.
- **Goals:** everyday_banking
- **Stage:** **later.** Only usable with a full-time paycheck and a branch on the list.
- **Source:** https://www.fnb-online.com/get600oct26
- **Related:** a "/denovo-promo-oct26" page advertises "earn up to $400" on Lifestyle or Premierstyle but publishes no terms. https://www.fnb-online.com/denovo-promo-oct26

### Removed: eStyle Plus Checking
- The first pass listed it. Its page now returns **404**.
- It does not appear in the current fee schedule, the sitemap or the checking comparison chart. Treat it as discontinued.
- It was dropped from the JSON.

---

## 2. Savings and money market

### FirstRate Savings (`firstrate-savings`)
- **Key terms:**
  - $5 monthly charge, waived with a $500 average daily balance.
  - **The charge is waived for account holders under 18.**
  - Tiered rate, compounded quarterly.
  - 6 withdrawals per month, then $15 each.
  - No early-closing fee.
- **Rate:** 0.01% APY on every tier (as of 10/24/2026).
- **Opening deposit:** $50 online; $0 in a branch.
- **Goals:** emergency_fund, travel, first_home, family
- **Stage:** **now**, paired with Student Checking.
  - It holds the emergency fund.
  - Watch the $5 fee until the balance reaches $500.
- **Sources:**
  - https://www.fnb-online.com/personal/checking-savings/savings/firstrate-savings
  - regional rates
  - fee schedule

### FirstRate Savings 3.00% APY Promotion (`firstrate-savings-promo-2026`) — NEW
- **Key terms:**
  - 3.00% promotional APY for at least 180 days.
  - Requires a new FirstRate Savings account funded with **$5,000+ in net-new money** (not moved from FNB).
  - You must also keep a qualifying checking account with an **active direct deposit**. Student Checking qualifies; Venmo and PayPal do not count as direct deposit.
  - Cash bonus tiers:

    | Net-new deposit | Bonus |
    |---|---|
    | $5,000–$9,999 | $50 |
    | $10,000–$24,999 | $125 |
    | $25,000–$49,999 | $325 |
    | $50,000–$99,999 | $750 |
    | $100,000–$249,999 | $1,500 |
    | $250,000–$499,999 | $4,000 |

  - Bonuses are paid quarterly and taxed as interest income.
  - Enrollment runs **Sep 3 to Oct 31, 2026**. The in-branch code is HYSQ326.
- **Goals:** emergency_fund, first_home, travel
- **Stage:** **later** for most students: it needs $5,000 and a paycheck. The enrollment window closes in one week.
- **Source:** https://www.fnb-online.com/2026firstratesavingspromo

### FirstRate Money Market (`firstrate-money-market`)
- **Key terms:**
  - $10 monthly charge, waived with a $5,000 average daily balance.
  - Check writing allowed.
  - 6 withdrawals per cycle, then $15 each.
- **Rates (as of 10/24/2026):**

  | Balance | APY |
  |---|---|
  | Under $10,000 | 0.05% |
  | $10,000–$49,999 | 0.10% |
  | $50,000–$99,999 | 0.15% |
  | $100,000–$999,999 | 0.25% |
  | $1M and up | 0.50% |

- **Opening deposit:** $50 online; $0 in a branch.
- **Goals:** emergency_fund, first_home, family
- **Stage:** **later.**
- **Sources:**
  - https://www.fnb-online.com/personal/checking-savings/savings/firstrate-money-market
  - regional rates

### Health Savings Account (`health-savings-account`)
- **Key terms:**
  - $25 setup fee and $20 annual fee, both waived for FNB personal checking customers.
  - Paper statements cost $3.95 and check images $3.00 per cycle.
- **Rate:** 0.01% APY.
- **Opening deposit:** $50 online; $0 in a branch.
- **HDHP eligibility rules:** not published.
- **Goals:** family, emergency_fund
- **Stage:** **later.** Needs a high-deductible health plan, usually through an employer.
- **Sources:**
  - https://www.fnb-online.com/personal/checking-savings/savings/health-savings
  - fee schedule

### IRA Savings (`ira-savings`)
- **Key terms:**
  - No minimum to open and no monthly fee.
  - Interest compounded monthly.
  - $50 fee to transfer the IRA to another institution.
- **Rate:** 0.01% APY.
- **Goals:** family
- **Stage:** **later.** Requires earned income.
- **Note:** the page still cites old IRS contribution limits ($5,500 / $6,500).
- **Sources:**
  - https://www.fnb-online.com/personal/checking-savings/savings/ira-savings
  - regional rates

---

## 3. CDs

All CD rates below are from FNB regional rates as of 10/24/2026.

### Certificates of Deposit, standard (`certificates-of-deposit`)
- **Key terms:** 3–60 month terms; $500 minimum; interest paid quarterly.
- **Rate:** 1.00% APY for 3–48 months; 1.50% APY for 60 months.
- **Early withdrawal penalty:** amount not published.
- **Goals:** first_home, travel, education
- **Stage:** **next.** Unlocks at $500 saved that will not be needed during the term.
- **Source:** https://www.fnb-online.com/personal/checking-savings/savings/certificates-of-deposit

### Certificate of Deposit Specials (`cd-special`)
- **Key terms:**
  - Requires new money and an FNB checking account (existing or new).
  - One per household.
  - Available in PA, OH, WV, NC, SC, VA, MD and DC.
- **Rates:**

  | Term | APY | Minimum balance for the promo rate |
  |---|---|---|
  | 5 months | 3.00% | $10,000 |
  | 7 months | 3.75% | $10,000 |
  | 13 months | 4.15% | $5,000 |
  | 19 months | 4.00% | $5,000 |
  | 25, 35, 52 or 61 months | 3.00% | $5,000 |

  The 19- to 61-month APYs are newly found in v2.
- **At maturity:** the CD rolls over at the base rate.
- **Goals:** first_home, travel, emergency_fund
- **Stage:** **later.** Unlocks at $5,000 saved.
- **Sources:**
  - https://www.fnb-online.com/personal/checking-savings/savings/certificate-of-deposit-specials
  - https://www.fnb-online.com/landing/deposit-specials
  - regional rates

### Savers Goal CD (`savers-goal-cd`)
- **Key terms:**
  - 12-month term; $100 to open.
  - **An automatic transfer of at least $25 a month** from FNB checking or savings is required.
  - Add money any time.
  - Renews automatically.
  - If transfers stop, FNB may convert it to FirstRate Savings.
  - Early withdrawal penalty: amount not published.
- **Rate:** **0.05% APY** (as of 10/24/2026).
- **Goals:** travel, first_home, emergency_fund, education, family
- **Stage:** **now/next.** Unlocks at $100 saved; it is a habit-building tool. Be honest that the rate is low; its value is the automation.
- **Sources:**
  - https://www.fnb-online.com/personal/checking-savings/savings/savers-goal-certificate-of-deposit
  - regional rates

### Flex CD (`flex-cd`)
- **Key terms:**
  - **9-month term**; $500 minimum.
  - Add $500 or more at any time, up to $100,000 total.
  - **One penalty-free withdrawal per month.** Per the savings compare page, it must be at least $500, be deposited to FNB checking, and meet 7-day holding rules.
  - Interest paid quarterly.
- **Rate:** **3.25% APY** (as of 10/24/2026).
- **Goals:** emergency_fund, first_home, travel
- **Stage:** **next.** Unlocks at $500 saved.
  - **This is the best-yielding product a student can realistically reach.** It pays 3.25% versus 0.01% in savings, with monthly access.
- **Sources:**
  - https://www.fnb-online.com/personal/checking-savings/savings/flex-cd
  - regional rates

### IRA CDs (`ira-cd`)
- **Key terms:** 3–60 month terms; $500 minimum (newly published in v2).
- **Rate:** 1.00% APY for 3–48 months; 1.50% APY for 60 months.
- **Goals:** family
- **Stage:** **later.**
- **Sources:**
  - https://www.fnb-online.com/personal/checking-savings/savings/ira-certificates-of-deposit
  - regional rates

### Not found
- No kids, teen, minor or Christmas Club savings account.
- The only youth-specific feature is that FirstRate Savings waives its monthly charge for holders under 18.

---

## 4. Credit cards

**Shared terms.** All five cards are Visa, have no annual fee and require credit approval. FNB weighs credit score, employment, debt-to-income and collateral. From the issuer disclosures (dated 12.11.25), each card has:
- Late payment fee: $25.
- Cash advance fee: the greater of $10 or 3%.
- Balance transfer fee: the greater of $10 or 4%.
- Foreign transaction fee: 2%.
- Penalty APR: 24.00%, applied if a payment is more than 60 days late.
- Grace period: at least 21 days.

**No student card.**

Rates in the card entries are from regional rates as of 10/24/2026.

### FNB SmartSecured (`smartsecured-card`)
- **Key terms:**
  - The credit limit equals a savings deposit of **$500–$2,000**.
  - **15.00% variable purchase APR** (Prime + 8.00%); cash advances 26.24%.
  - Returned payment fee $25.
  - Page 2 of the disclosure says the costs are "accurate as of September 2019".
- **Graduation to an unsecured card:** not published.
- **Goals:** credit_building
- **Stage:** **next.** Unlocks at $500 saved for the deposit, plus a steady payment habit.
  - The Slippery Rock University landing page calls it "a great first credit card" for students.
- **Sources:**
  - https://www.fnb-online.com/personal/loans-mortgages/personal-loans/personal-credit-cards/smart-secured-credit-card
  - https://www.fnb-online.com/-/media/fnbonline/files/feature/product/personal/credit-cards/2023/smart-secured-credit-card-disclosure.pdf

### FNB SmartCash (`smartcash-card`)
- **Key terms:**
  - 2% cash back with no cap.
  - **0% intro APR for 12 months** on purchases, and on balance transfers made within 60 days of opening (new in v2). Then **18.24%–26.24%**.
- **Goals:** everyday_banking, credit_building, family
- **Stage:** **later.** Requires an established credit history.
- **Sources:**
  - https://www.fnb-online.com/personal/loans-mortgages/personal-loans/personal-credit-cards/cash-back
  - the card disclosure PDF (…/branch-credit-card-disclosure-smart-cash.pdf)

### FNB SmartRewards (`smartrewards-card`)
- **Key terms:**
  - 1 point per $1, doubled for the first 90 days.
  - Points expire after 5 years.
  - 0% intro APR for 12 months on purchases, and on balance transfers made within 60 days. Then **17.24%–25.24%**.
- **Goals:** travel, credit_building
- **Stage:** **later.**
- **Sources:**
  - https://www.fnb-online.com/personal/loans-mortgages/personal-loans/personal-credit-cards/rewards-cc
  - …/branch-credit-card-disclosure-smart-rewards.pdf

### FNB SmartRate (`smartrate-card`)
- **Key terms:**
  - FNB's lowest-rate card.
  - 0% intro APR for 12 months; balance transfers must be made within 60 days of opening.
  - Then **15.74%–23.74%**.
- **Goals:** credit_building, emergency_fund
- **Stage:** **later.**
- **Sources:**
  - https://www.fnb-online.com/personal/loans-mortgages/personal-loans/personal-credit-cards/rates-credit-card
  - …/branch-credit-card-disclosure-smart-rate.pdf

### Penguins Cash Back (`penguins-cash-back-card`)
- **Key terms:**
  - 2% cash back.
  - Penguins ticket discounts; 15% off in-store at PensGear.
  - 0% intro APR for 12 months, then **18.24%–26.24%**.
  - The optional "Power Play Package" costs $25 a year (consumer fee schedule).
- **Goals:** everyday_banking
- **Stage:** **later.**
- **Sources:**
  - https://www.fnb-online.com/personal/loans-mortgages/personal-loans/personal-credit-cards/penguins-credit
  - …/branch-credit-card-disclosure-pens-credit-card.pdf

---

## 5. Mortgages and first-time homebuyer programs

**What applies to all of these:**
- FNB publishes no mortgage rates. The regional rate feed has no mortgage products.
- No income limits are published.
- All loans are subject to underwriting.
- **How to apply:** add the loan to the eStore cart, then apply online or book an expert at checkout. Each page also has a "Contact a Local Expert" link.
- **Documents to prepare:** 30 days of pay stubs, 2 months of bank statements, 2 years of W-2s and tax returns, photo ID, and the purchase agreement.
- **Stage for every mortgage:** **later.** Unlocks with steady income, a down-payment and closing fund, and a credit score.
- **Hubs:**
  - https://www.fnb-online.com/personal/loans-mortgages/mortgages/first-time-home-buyer
  - https://www.fnb-online.com/landing/first-time-homebuyer
  - https://www.fnb-online.com/landing/lmi

### FNB Home Ownership Program (`fnb-home-ownership-program`)
- **For:** low- to moderate-income borrowers, or buyers in LMI communities.
- **Key terms:**
  - Little or no down payment.
  - Up to a **$5,000 closing cost assistance grant**.
  - No mortgage insurance.
  - Less-than-perfect credit considered.
  - Gift or grant money can cover closing costs.
- **Homebuyer education requirement:** not published.
- **Goals:** first_home, family
- **Sources:**
  - https://www.fnb-online.com/personal/loans-mortgages/mortgages/buy-a-home/fnb-home-ownership-program
  - /landing/lmi

### FNB Home Ownership Plus Program (`home-ownership-plus-program`) — detail now captured
- **For:** properties in a **majority-minority census tract (MMCT)**, where more than 50% of residents are minorities. Open to first-time buyers and existing owners. The page has an address-eligibility checker.
- **Key terms:**
  - **100% financing up to $832,750**; no down payment.
  - Up to $5,000 closing cost assistance.
  - No mortgage insurance.
  - **Credit scores from 620**, plus alternative credit such as rent and utilities.
  - **First-time buyers must complete homeownership counseling** from a government-approved agency and provide a written certificate.
- **Goals:** first_home, family
- **Sources:**
  - https://www.fnb-online.com/personal/loans-mortgages/mortgages/buy-a-home/home-ownership-plus-program
  - https://www.fnb-online.com/landing/homeownership-and-home-equity-plus
  - https://www.fnb-online.com/landing/community-uplift

### Homeownership Plus + Community Uplift Program (`community-uplift-program`) — NEW
- **What it is:** pairs Home Ownership Plus with **down payment assistance**. The assistance amount is not published.
- **Availability:** select markets only. FNB's down-payment-assistance article says the same.
- **How to apply:** fill in the web form; a specialist calls back within 48 hours.
- **Goals:** first_home, family
- **Sources:**
  - https://www.fnb-online.com/landing/community-uplift
  - https://www.fnb-online.com/personal/knowledge-center/buy-a-home/do-you-qualify-for-downpayment-assistance

### FNB Home Rehabilitation Program (`fnb-home-rehabilitation-program`)
- **Key terms:**
  - Buy a home and finance its repairs in one loan.
  - Little or no down payment; no mortgage insurance.
  - Up to $5,000 closing cost grant.
  - Less-than-perfect credit considered.
- **Goals:** first_home, family
- **Source:** https://www.fnb-online.com/personal/loans-mortgages/mortgages/buy-a-home/fnb-home-rehabilitation-program

### HomeOne (Freddie Mac) (`homeone-mortgage`)
- **For:** first-time buyers, with no income or geographic limits.
- **Key terms:**
  - **3% down payment.**
  - Fixed rate.
  - **Homebuyer education is required.** The provider is not named.
  - Single-family homes, townhouses and condos.
- **Goals:** first_home
- **Source:** https://www.fnb-online.com/personal/loans-mortgages/mortgages/buy-a-home/homeone-program

### HomeReady (Fannie Mae) (`homeready-mortgage`)
- **For:** low-income buyers, first-time or repeat.
- **Key terms:**
  - Low down payment; the percentage is not published.
  - Gifts and grants allowed, with no minimum from your own funds.
  - Cancellable mortgage insurance.
  - Fixed or ARM.
  - Non-occupant co-borrowers allowed.
  - The page explicitly mentions borrowers with student loans and parental income help.
- **Goals:** first_home, family
- **Source:** https://www.fnb-online.com/personal/loans-mortgages/mortgages/buy-a-home/homeready

### Home Possible (Freddie Mac) (`home-possible-mortgage`)
- **For:** low- to moderate-income borrowers.
- **Key terms:**
  - Low down payment.
  - Cancellable mortgage insurance.
  - **Education is required only if all borrowers are first-time buyers.**
  - Income from non-occupant borrowers, including rental income, can count.
- **Contradiction:** the page also says "No geographic or income restrictions". See Contradictions.
- **Goals:** first_home, family
- **Source:** https://www.fnb-online.com/personal/loans-mortgages/mortgages/buy-a-home/home-possible

### Fannie Mae 97% (`fannie-mae-97-mortgage`)
- **Key terms:** finance up to 97% of the value; fixed rate; less-than-perfect credit considered.
- **Goals:** first_home
- **Source:** https://www.fnb-online.com/personal/loans-mortgages/mortgages/buy-a-home/fannie-mae

### FHA Fixed Rate (`fha-mortgage`)
- **Key terms:** low down payment; fixed rate; less-than-perfect credit considered; mortgage insurance required on all FHA loans.
- **Goals:** first_home, family
- **Source:** https://www.fnb-online.com/personal/loans-mortgages/mortgages/buy-a-home/fha-mortgage

### VA Home Loan (`va-home-loan`) — detail now captured
- **For:** active duty, veterans, Reserve and Guard members, and some surviving spouses.
- **Key terms:**
  - A Certificate of Eligibility is required.
  - Little or no down payment; no mortgage insurance.
  - No prepayment penalty.
  - The page lists "Payment assistance available" with no detail.
- **Goals:** first_home, family
- **Source:** https://www.fnb-online.com/personal/loans-mortgages/mortgages/buy-a-home/va-home-loan

### USDA Home Loan (`usda-home-loan`) — detail now captured
- **For:** low- to average-income buyers in eligible rural and suburban areas. FNB says about 97% of U.S. land qualifies.
- **Key terms:**
  - 100% financing.
  - Eligible closing costs can be rolled into the loan.
  - Gifts, grants and seller contributions allowed.
- **Goals:** first_home, family
- **Source:** https://www.fnb-online.com/personal/loans-mortgages/mortgages/buy-a-home/usda

### Conventional Fixed Rate (`fixed-rate-mortgage`), Adjustable Rate (`adjustable-rate-mortgage`), New Construction/Renovation (`construction-renovation-mortgage`) — NEW
- **Fixed rate:** standard fixed-rate mortgage with multiple terms.
- **ARM:**
  - Lower initial rate.
  - The page contradicts itself on how often the rate adjusts (see Contradictions).
- **Construction/renovation:**
  - One closing for purchase plus renovation.
  - Rate fixed at the start.
  - Up to 12 months of interest-only payments during construction.
  - Low down payment options.
- **Goals:** first_home, family
- **Sources:**
  - …/buy-a-home/fixed-rate-mortgage
  - …/buy-a-home/adjustable-rate-mortgage
  - …/buy-a-home/home-improvement
  - All under https://www.fnb-online.com/personal/loans-mortgages/mortgages/

### Other mortgage pages (in the sitemap; not cataloged as student-relevant)
- Jumbo fixed and ARM.
- Mortgage Solutions for Physicians.
- Residential lot loan.
- Home equity bridge loan.
- FHA Streamline refinance and VA IRRRL refinance.

### Down payment and closing-cost help: what FNB publishes
- $5,000 closing cost grant (Home Ownership, Home Ownership Plus, Home Rehabilitation).
- Community Uplift down payment assistance (amount not published).
- Gift and grant funds allowed on HomeReady, USDA, Home Ownership and Home Rehabilitation.
- **No state housing agency programs found:** no PHFA, MD DHCD or similar pages on fnb-online.com.

### Homebuyer education and counseling
- **Required by:**
  - HomeOne (always).
  - Home Possible (if all borrowers are first-time buyers).
  - Home Ownership Plus / Community Uplift (first-time buyers need counseling from a government-approved agency).
- **FNB's own free seminars:** see `homebuyer-education-seminars` in section 11.

---

## 6. Home equity

Available only in PA, OH, MD, WV, NC, SC, VA and DC. Rates are from regional rates as of 10/24/2026; Prime was 7.00% as of 9/24/2026.

- **Home Equity Installment Loan** (`home-equity-installment-loan`)
  - Fixed rate; up to 85% combined loan-to-value.
  - Terms of 8, 10, 15 and 20 years.
  - "As low as" 5.99%–7.04% APR depending on term and amount.
  - Source: https://www.fnb-online.com/personal/loans-mortgages/home-equity-loans/home-equity-installment-loan
- **HELOC** (`heloc`)
  - Variable rate tied to Prime; up to 85% of home value, less existing liens.
  - Draw period of about 7 years.
  - LockOption costs $75 per lock.
  - "As low as" 6.49%–6.74% APR.
  - Source: https://www.fnb-online.com/personal/loans-mortgages/home-equity-loans/home-equity-line-of-credit
- **Home Equity Plus** (`home-equity-plus`)
  - Only for properties in majority-minority census tracts.
  - Up to $750,000; terms up to 240 months.
  - FICO scores as low as 640 considered.
  - HELOC Plus is Prime minus 1.25% = **5.75% APR**, with a $50 annual fee that may apply and a $350 fee if closed within 3 years.
  - Installment Plus "as low as" 5.74%–6.24%.
  - Source: https://www.fnb-online.com/personal/loans-mortgages/home-equity-loans/home-equity-plus-program
- **Goals:** family (all three); the installment loan also tags education and small_business.
- **Stage:** **later** for all. Requires owning a home.

---

## 7. Auto loans

### Automobile Loan (`auto-loan`)
- **Key terms:**
  - Borrow $7,500–$100,000.
  - Used vehicles back to model year 2017 appear in the rate table.
  - Terms of 12–72 months; 66 months maximum for 2017–2021 models.
  - Published rates include a **0.25% autopay discount**.
- **Rates (as of 10/24/2026, rates as of 9/17/2026, based on a $10,000 loan):**

  | Vehicle | Term | APR as low as | Monthly payment (≈) |
  |---|---|---|---|
  | New 2025–26 | 12–60 months | 5.69% | $191.89 |
  | New 2025–26 | 61–72 months | 6.09% | $166.15 |
  | Used 2024–26 | 12–60 months | 5.79% | n/a |
  | Used 2017–21 | 12–66 months | 6.99% | n/a |

- **Refinancing:** not mentioned.
- **Goals:** family, everyday_banking
- **Stage:** **later.** Unlocks with income to support payments; the $7,500 minimum rules out cheap beaters.
- **Sources:**
  - https://www.fnb-online.com/personal/loans-mortgages/vehicle-loans/automobile-loans
  - loan regional rates

---

## 8. Personal loans

### CashPlease Small Dollar Loan (`cashplease`)
- **Key terms:**
  - Borrow $100–$525; repay in 3 monthly payments.
  - No credit check or collateral; no annual fee.
  - Funds usually within 24 hours of approval.
  - At most 2 loans in any rolling 6 months.
  - The application is fully online.
- **Eligible accounts:** the list is Lifestyle, Freestyle, Mystyle, Premierstyle, Workplace Banking, Workplace First, Private Banking Select, Private Banking Select Plus, Lifestyle 50, Lifestyle 50 Plus and Preferred Interest Checking.
  - **Student Checking and eStyle are not eligible.**
- **Requirements:** age 18+; account in good standing and open at least 120 days.
- **APR:** not published. The page says "affordable, fixed interest rate".
- **Goals:** emergency_fund, credit_building
- **Stage:** **later/next.** Only after moving to an eligible checking account for 120 days. Present it as the payday-loan alternative.
- **Source:** https://www.fnb-online.com/personal/loans-mortgages/personal-loans/cash-please

### Unsecured Installment Loan (`unsecured-installment-loan`)
- **Key terms:**
  - Borrow $2,500–$50,000; fixed rate.
  - Terms of 6–60 months; 24 months maximum for $2,500–$3,500.
  - The autopay discount is included in the published rates.
- **Rate:** "as low as" **8.20%–12.45% APR** (rates as of 10/22/2026), from the regional rate table:

  | Amount / term | APR as low as |
  |---|---|
  | $15,000–$50,000, 6–36 months | 8.20% |
  | $2,500–$4,999, 6–36 months | 10.70% |
  | $2,500–$4,999, 49–60 months | 12.45% |

- **Goals:** family, travel, emergency_fund
- **Stage:** **later.**
- **Sources:**
  - https://www.fnb-online.com/personal/loans-mortgages/personal-loans/installment-loans/unsecured-installment-loan
  - loan regional rates

### Unsecured Line of Credit (`unsecured-line-of-credit`)
- **Key terms:**
  - $2,500–$25,000; variable rate tied to Prime.
  - Can serve as overdraft protection: $10 per transfer, made in $100 increments.
- **APR:** not published.
- **Goals:** emergency_fund
- **Stage:** **later.**
- **Source:** https://www.fnb-online.com/personal/loans-mortgages/personal-loans/lines-of-credit/unsecured-line-of-credit

### Secured Installment Loan (`secured-installment-loan`) — NEW
- **Key terms:**
  - Secured by an FNB savings account or CD.
  - Up to $250,000; fixed or variable rate.
  - The page notes a lower rate than unsecured loans.
- **Minimum amount and APR:** not published.
- **Goals:** credit_building, family
- **Stage:** **next.** This is a share-secured credit-builder option once savings exist. FNB does not market it as a credit builder; that is an inference.
- **Source:** https://www.fnb-online.com/personal/loans-mortgages/personal-loans/installment-loans/secured-installment-loan

### Secured Line of Credit (`secured-line-of-credit`) — NEW
- **Key terms:**
  - Secured by an FNB savings account or CD; up to $250,000.
  - Variable rate tied to Prime.
  - Can serve as overdraft protection.
- **Goals:** emergency_fund, credit_building
- **Stage:** **next.**
- **Source:** https://www.fnb-online.com/personal/loans-mortgages/personal-loans/lines-of-credit/secured-line-of-credit

---

## 9. Student loans (partner programs) and refinance

**Hubs:**
- https://www.fnb-online.com/personal/checking-savings/specialty-banking/student-banking-loans/loans
- …/student-banking-loans/student-loans

### PA Forward Student Loans, PHEAA (`pa-forward-student-loans`)
- **For:**
  - PA residents at approved schools in or out of PA.
  - Residents of DE, MD, NJ, NY, OH, VA and WV at approved **PA** schools. A Maryland student at Penn State qualifies.
- **Loan types:** undergraduate, graduate and parent loans.
- **Key terms:**
  - No fees; low fixed rates; "potential interest rate rewards".
  - Up to 100% of certified cost of attendance.
  - **$150,000 aggregate limit; $1,500 minimum.**
  - Less-than-half-time students: $5,000 maximum per loan.
  - A co-signer is needed only if the borrower is under the age of majority or below credit minimums.
  - U.S. citizens or permanent residents only.
  - Parent loans require the student to be enrolled at least half-time.
- **APR:** not published on fnb-online.com.
- **Goals:** education
- **Stage:** **now**, as a last resort after federal aid.
- **Sources:**
  - …/pa-forward-student-loans
  - …/pa-forward-student-loans/undergraduate-loan
  - …/pa-forward-student-loans/parent-loan

### Keystone Student Loans, PHEAA (`keystone-student-loans`)
- **For:** residents of DE, MD, NJ, NY, OH, VA and WV at approved schools **outside PA**.
- **Key terms:** same as PA Forward: $150,000 aggregate, $1,500 minimum, no fees, fixed rates.
- **Goals:** education
- **Stage:** **now**, for non-PA schools only.
- **Sources:**
  - …/keystone-student-loans
  - …/keystone-student-loans/undergraduate-loan

### Sallie Mae Smart Option (`sallie-mae-smart-option`)
- **What it is:** a partner link to Sallie Mae for undergraduate and graduate loans.
- **Key terms:** FNB says "no origination fees". Rates and terms are not on fnb-online.com.
- **Goals:** education
- **Stage:** **now.**
- **Source:** …/student-banking-loans/loans

### PA Forward Refinance Loan (`pa-forward-refinance-loan`)
- **For:** borrowers in repayment who live in PA, DE, MD, NJ, NY, OH, VA or WV.
- **Key terms:**
  - **$5,000 minimum; $300,000 aggregate limit.**
  - No application fees.
  - Rate reduction for direct debit.
- **Goals:** education
- **Stage:** **later.** After graduation, once in repayment.
- **Source:** …/pa-forward-student-loans/refinance-loan

### Physicians Education Refinance Loan (`physicians-education-refinance-loan`)
- **For:** graduates with an MD, DO, DMD, DDS, DVM, DPM or CRNA degree.
- **Key terms:**
  - Borrow $10,000–$400,000.
  - No origination or annual fees.
  - Autopay discount.
- **Rates (fixed APR, as of 10/24/2026):**

  | Term | APR |
  |---|---|
  | 5 years | 5.50%–6.20% |
  | 10 years | 5.90%–6.60% |
  | 15 years | 6.30%–7.00% |
  | 20 years | 6.80%–7.50% |

- **Goals:** education
- **Stage:** **later.** Medical and dental graduates only.
- **Source:** https://www.fnb-online.com/personal/loans-mortgages/personal-loans/physicians-education-refinance-loan---fixed-rate

---

## 10. Small business (student founders)

### Free Small Business Checking (`free-small-business-checking`)
- **Key terms:**
  - No monthly charge.
  - 150 free transactions a month, then **$0.35 per item**.
  - $4,999.99 in cash deposits free each month, then **$0.25 per $100**.
  - $200 Merchant Services credit.
  - Negative collected balance is charged at Prime + 5%.
- **Opening deposit:** $50 online; $0 in a branch.
- **Documents:** ID, SSN and/or EIN, plus formation documents depending on the business type.
- **Goals:** small_business
- **Stage:** **now**, for a student with a registered business or a sole proprietorship.
- **Sources:**
  - https://www.fnb-online.com/business/checking-savings/business-checking/free-small-business-checking
  - Business Fee Schedule

### Small Business Financial Solutions (`small-business-financial-solutions`) — CORRECTED
- **Correction:** the first pass labeled this page "Business First Checking". The page at `/small-business-solutions` is actually **Small Business Financial Solutions**.
- **Key terms:**
  - $29 monthly charge, waived with a $5,000 minimum daily or $15,000 average daily balance.
  - 500 free transactions a month.
  - 0.35% discount on new business loans or lines.
  - No-fee business line of credit and Solutions credit card.
  - $100 Merchant Services rebate; 30% off terminal equipment.
  - Free basic remote deposit scanner.
- **Opening deposit:** $50 online; $0 in a branch.
- **Goals:** small_business
- **Stage:** **later.** Unlocks once business balances reach $5,000.
- **Source:** https://www.fnb-online.com/business/checking-savings/business-checking/small-business-solutions

### Business First Checking (`business-first-checking`) — CORRECTED
- **Real terms (from its own page and the fee schedule):**
  - **$85 monthly charge.** The fee schedule says it is waived with a $50,000 minimum daily balance. The product page says a $50,000 aggregated average ledger balance across up to 4 accounts.
  - Up to 600 free transactions a month.
  - $25,000 in cash deposits free each month.
  - Metal debit card; QuickBooks connection; optional fraud tools.
- **Opening deposit:** $0 in a branch.
- **Goals:** small_business
- **Stage:** **later.**
- **Sources:**
  - https://www.fnb-online.com/business/checking-savings/business-checking/business-first-checking
  - Business Fee Schedule

### FirstRate Business Savings (`firstrate-business-savings`) — NEW
- **Key terms:** $5 monthly charge, waived with a $500 minimum average daily balance; tiered rate; no minimum to open in a branch.
- **Goals:** small_business, emergency_fund
- **Stage:** **next.**
- **Source:** https://www.fnb-online.com/business/checking-savings/business-savings/firstrate-business-savings

### SBA 7(a) (`sba-7a-loan`) — detail now captured
- **What it funds:** startup expenses, equipment, working capital, real estate and acquisitions.
- **Key terms:**
  - SBA maximum $5M. **FNB typically considers $350,000–$5,000,000.**
  - Terms of 10–25 years, fully amortizing.
  - SBA guarantee fee of about 2.25%.
  - Financing covers 70–100% of project cost.
- **Bundle:** "Better Together" pairs it with Free Small Business Checking.
- **Goals:** small_business
- **Stage:** **later.** Out of reach for a student startup at FNB's typical minimum.
- **Sources:**
  - https://www.fnb-online.com/business/loans-leasing/sba-lending/our-products/sba-7a-loan-program
  - https://www.fnb-online.com/business/loans-leasing/sba-lending

### SBA 504 (`sba-504-loan`)
- **For:** existing businesses only, buying real estate or equipment.
- **Key terms:**
  - 50/40/10 structure (bank / Certified Development Company / borrower).
  - No minimum loan size.
  - One job required per $65,000 of loan proceeds.
- **Goals:** small_business
- **Stage:** **later.**
- **Source:** …/sba-lending/our-products/sba-504-loan-program

### SBA Express (`sba-express-loan`)
- **Key terms:** maximum $350,000. **Not offered on its own** at FNB; it is a working-capital line added to a 7(a) or 504 loan.
- **Goals:** small_business
- **Stage:** **later.**
- **Source:** …/sba-lending/our-products/sba-express-loan

### Business Unsecured Line of Credit (`business-unsecured-line-of-credit`), Solutions Business Credit Card (`solutions-business-credit-card`)
- **Line of credit:** unsecured; amount and rate not published.
- **Credit card:** no annual fee; bonus points; employee cards.
- **Goals:** small_business (the card also tags credit_building)
- **Stage:** **later.**
- **Sources:**
  - https://www.fnb-online.com/business/loans-leasing/lending/short-term-financing/unsecured-line-of-credit
  - https://www.fnb-online.com/business/loans-leasing/lending/business-credit-card

### FNB Rural Main Street Revitalization Grant (`rural-main-street-grant`) — NEW
- **For:** Greenville, PA Commercial Historic District only.
- **Key terms:** grants up to **$50,000** for façade improvements, run with Pittsburgh History & Landmarks Foundation.
- **Relevance:** included for completeness; not relevant to most students.
- **Goals:** small_business
- **Stage:** **later.**
- **Sources:**
  - https://www.fnb-online.com/grants-and-loans-for-local-businesses
  - …/fnb-rural-main-street-revitalization-program

### Not found
- No startup or microloan product.
- No student-founder program.
- No business pitch competitions.

---

## 11. Digital tools, education and programs (JSON category `education_tool`)

### Financial Insights Learning Center (`learning-center`)
- **Tracks:** Personal, College and High School.
- **Personal modules:** Checking Accounts, Car Loans, Credit Cards, Credit Scores & Reports, Identity Protection, Creating a Budget, Buying a Home.
- **College track:** free EVERFI modules on budgeting, credit, identity theft and cybersecurity, financing higher education, and banking 101.
  - https://fnb.everfi-next.net/welcome/achieve-foundation (third-party site)
- **High school track:** playlists of three to five 10-minute lessons.
  - https://fnb.everfi-next.net/welcome/k-12-elevate-learning
- **Teachers:** can register for lesson plans at /lessons.
- **Goals:** education, credit_building, everyday_banking, first_home
- **Stage:** **now.**
- **Sources:**
  - https://www.fnb-online.com/learning-modules
  - https://www.fnb-online.com/lessons

### Knowledge Center (`knowledge-center`)
- **What it is:** articles and videos.
- **Student-relevant pieces:**
  - Post-College Finances 101.
  - Creative Solutions to Lower the Cost of College.
  - Saving for College ("help-your-student-get-started").
  - Health Insurance for College Students.
  - Roth IRAs for Kids.
  - Budgeting Basics.
  - Budgeting for Couples.
  - Teach Your Kids About Finances.
  - First-Time Homebuying, Parts 1 and 2.
  - Do You Qualify for Down Payment Assistance?
  - Overdraft Coverage.
  - Build Credit.
- **Goals:** education, first_home, family, credit_building
- **Stage:** **now.**
- **Source:** https://www.fnb-online.com/personal/knowledge-center

### FNB $15,000 Student Scholarship Sweepstakes (`fnb-student-scholarship`) — rules now captured
- **Sponsor:** FNB Corporation Foundation.
- **Dates:**
  - **Entry:** May 4, 2026, 12:00:01 AM ET to Nov 30, 2026, 11:59:59 PM ET.
  - **Mail-in entries:** postmarked by Nov 25.
  - **Drawing:** about Dec 1, 2026.
- **Eligibility:**
  - Legal residents of PA, OH, WV, MD, VA, NC, SC or DC.
  - Age 18+ at entry.
  - Must be **a full-time undergraduate** at an accredited U.S. college, **or that student's parent or guardian**.
  - Under 18s need parental consent.
  - Under 13s are not eligible.
- **Prizes:** **one $15,000 Grand Prize and one $5,000 First Prize**, $20,000 total, paid directly to the school.
- **Rules:** one entry per person; no purchase or account required.
- **Goals:** education
- **Stage:** **now.**
  - **Action item for Waypoint users:** enter before Nov 30, 2026.
- **Sources:**
  - https://www.fnb-online.com/personal/checking-savings/specialty-banking/student-banking/fnb-student-scholarship
  - Official Rules PDF: https://www.fnb-online.com/-/media/FNBOnline/Files/Feature/Product/Personal/Checking-Savings/Student/official-rules-sweepstakes-1

### Credit Center (`credit-center`)
- **What it does:**
  - Free TransUnion report with a VantageScore 3.0 score, updated monthly or on demand.
  - Soft inquiry, so it does not affect the score.
  - Alerts, tips and in-app disputes.
- **Note:** FNB underwrites with FICO Auto 08, which may differ from the score shown.
- **Goals:** credit_building
- **Stage:** **now.**
- **Source:** https://www.fnb-online.com/personal/checking-savings/online-mobile-options/credit-center

### CardGuard and Spend Insights (`cardguard`)
- **Controls:**
  - Turn the card on or off.
  - Spend limits.
  - Location, merchant-type and transaction-type controls.
  - Block international transactions.
- **Alerts:** real-time alerts on approved or declined transactions.
- **Spend Insights (new detail):** "what, when and where" breakdowns of debit-card spending.
- **Card on File:** manage which merchants hold your card.
- **Travel plans:** up to 2 per card, covering up to 15 days.
- **Cost:** free.
- **Goals:** everyday_banking, travel, emergency_fund
- **Stage:** **now.**
- **Sources:**
  - …/mobile-banking/cardguard
  - …/mobile-banking/travel-plans

### FNB Direct Mobile and Online Banking (`fnb-direct-mobile-app`)
- **Features:**
  - Mobile deposit and balance alerts.
  - Bill pay and e-bills.
  - External transfers.
  - 2 years of history, statements and tax forms.
  - Secure chat, auto-translated in about 75 languages.
  - SMS banking (short code 91489).
  - Biometric login.
  - In-app eStore.
- **Budgeting:** the online-banking page lists "Manage your budget with FNB budgeting tools" but does not describe them.
- **Not found:** no published savings-goal, round-up or auto-save feature. The only scheduled savings mechanism is the Savers Goal CD's required automatic transfer.
- **Goals:** everyday_banking
- **Stage:** **now.**
- **Sources:**
  - …/online-mobile-options/mobile-banking
  - …/online-mobile-options/online-banking
  - fee schedule

### Zelle (`zelle`)
- **Key terms:** free to send or request. Both parties need an eligible account.
- **Goals:** everyday_banking
- **Stage:** **now.**
- **Source:** …/mobile-banking/zelle

### Direct Deposit Switch (`direct-deposit-switch`) — NEW
- **What it does:** moves a paycheck to FNB checking, savings or money market inside online or mobile banking, through payroll connection, copy-paste or a prefilled form.
- **Timing:** takes effect the same or next pay cycle. Launched April 2025.
- **Why it matters:** direct deposit is the gate for the 3.00% savings promo and the $600 checking promo.
- **Goals:** everyday_banking, emergency_fund
- **Stage:** **next.** Unlocks with a first paycheck (campus job or internship).
- **Sources:**
  - …/online-mobile-options/switch
  - press release 4/14/2025

### Payment Switch (`payment-switch`) — NEW
- **What it does:** moves recurring card or ACH payments (streaming, ride share, utilities) to FNB in the app. Launched December 2025.
- **Goals:** everyday_banking
- **Stage:** **now.**
- **Sources:**
  - …/online-mobile-options/payment-switch
  - press release 12/16/2025

### Mortgage calculators (`mortgage-calculators`) — NEW
- **Calculators:** affordability, down payment comparison, fixed vs adjustable, principal and interest, refinance, rent vs buy.
- **Goals:** first_home
- **Stage:** **now.** Good for a "first home" goal simulation.
- **Source:** https://www.fnb-online.com/personal/loans-mortgages/mortgages/calculators

### FNB Homebuyer Education Seminars (`homebuyer-education-seminars`) — NEW
- **Format:** free sessions on credit, budgeting, the loan process and homebuying partners. Spanish interpretation is provided.
- **Schedule:**

  | City | Date | Format |
  |---|---|---|
  | Charlotte, NC | Sat Nov 14, 2026, 10 AM–1 PM | In person, Latin American Coalition |
  | Winston-Salem, NC | Sat Nov 7, 2026 | In person |
  | Winston-Salem, NC | Sat Nov 14, 2026 | Virtual |
  | Baltimore, MD | No upcoming date (last held July 11, 2026) | n/a |

- **Not found:** no Pennsylvania seminars.
- **Goals:** first_home, family
- **Stage:** **later.**
- **Source:** https://www.fnb-online.com/landing/homebuyereducation

### eStore and Common App (`estore-common-app`)
- **What it does:** add products to a cart, then apply for several products in one application. At checkout, apply online or book an in-person appointment.
- **Where it works:** the website, the app and branches.
- **Scale:** FNB says 50+ consumer and business products as of March 2026. The Dec 2025 press release said 40+ accounts.
- **Goals:** everyday_banking
- **Stage:** **now.**
- **Sources:**
  - https://www.fnb-online.com/estore
  - https://www.fnb-online.com/estore-common-app
  - press release 3/10/2026

### FNB at Penn State (`penn-state-student-banking`) — NEW, high value for this team
- **Landing page:** https://www.fnb-online.com/landing/penn-state
- **Branches near University Park:**
  - **Penn State HUB, 288 Pollock Road.**
  - College Ave, 366 E College Ave.
  - Allen Street, 117 S Allen St.
  - Allen Street Drive-Up.
  - Lemont.
  - Hills Plaza.
  - North Atherton.
- **ATMs:** 10 on or near campus, including the HUB, Redifer, Pollock, Findlay and Waring Commons, and Bryce Jordan Center.
- **Student offers:**
  - **PSU-branded debit card** for existing Student Checking accounts; request it at a branch.
  - Student Checking + FirstRate Savings bundle.
  - Financial Insights, Credit Center and CardGuard promoted.
  - Renters insurance (First National Insurance Agency).
  - Scholarship entry.
- **Employees:** a separate Workplace Banking page for PSU employees: https://www.fnb-online.com/landing/psu-workplace
- **Goals:** everyday_banking, education
- **Stage:** **now.**

### International Student Banking (`international-student-banking`)
- **Opening an account:**
  - Without an SSN or ITIN you must apply in a branch.
  - Requires a U.S. phone number and a U.S. address.
  - Bring 2 IDs (passport plus a student visa or U.S. student ID) and a W-8BEN form.
- **Wires:** Student Checking includes 1 free incoming wire per cycle.
  - Routing number for domestic wires: 043318092.
  - SWIFT code: FNBPUS33.
- **Language help:** translation services in branches; chat in about 75 languages.
- **Goals:** everyday_banking, education
- **Stage:** **now.**
- **Source:** https://www.fnb-online.com/landing/international-students

### FNB Internships and Development Programs (`fnb-internships`)
- **What it is:** paid internships across many departments, plus 12-month+ development programs for graduates (including Digital Channels, Data & AI).
- **Why include it:** it is a "build income" lever for a goals-first plan.
- **Goals:** education
- **Stage:** **now.**
- **Source:** https://www.fnb-online.com/about-us/careers/students-and-graduates

### Other student/school landing pages (not separate JSON entries)
- **Slippery Rock University:**
  - Branded "Rocky" debit card.
  - Pitches SmartSecured as a first card.
  - https://www.fnb-online.com/landing/slipperyrock
- **Financial planning with a Financial Advisor** (F.N.B. Wealth Management / Cetera; investments are not FDIC insured):
  - The "Starting Out" and "Young Family" pages are just appointment pages; no planning tool is published.
  - https://www.fnb-online.com/landing/brokerage/starting-out
  - https://www.fnb-online.com/landing/brokerage/young-family

### Community and CRA (context, not products)
- **Community involvement page:** lists financial education workshops (home buying, budgeting, saving), the Home Ownership and Rehabilitation programs, SBA Preferred Lender status, LIHTC and Educational Improvement Tax Credits.
  - https://www.fnb-online.com/about-us/corporate-information/community-involvement
- **CRA "Products and Services" page:** just links to the eStore and the fee schedules.
  - https://www.fnb-online.com/about-us/corporate-information/community-involvement/cra/products-and-services
- **Sep 3, 2026 press release:**
  - $1.1M+ to 40 Pennsylvania Neighborhood Assistance Program projects.
  - $2M+ to 110+ education organizations through the Educational Improvement Tax Credit (EITC) program in 2025.

---

## 12. How to engage FNB

- **Online:** eStore cart, then checkout to apply online or book an appointment. Also available in the FNB Direct app and in branches.
  - https://www.fnb-online.com/estore
- **Appointments:** https://www.fnb-online.com/schedule-an-appointment
  - "Meet with an expert via phone or at one of our more than 355 locations."
  - **Personal topics:** Personal Banking, Residential Mortgages, Investment Services, Insurance, Private Banking.
  - **Business topics:** Business Deposit, Business Lending, SBA Lending, and more.
  - The booking step itself (`/schedule-an-appointment/book-an-appointment`) renders client-side, so the time-slot flow could not be captured.
- **Phone:**

  | Number | Use |
  |---|---|
  | 1-800-555-5455 | Accounts, online banking, debit card, lost/stolen debit (24/7) |
  | 1-833-BANK-FNB (1-833-226-5362) | Department directory |
  | 1-844-BANK-FNB (1-844-226-5362) | Lost or stolen credit card |

  Contact center hours: Mon–Fri 8 AM–9 PM, Sat–Sun 8 AM–5 PM. The same hours apply to secure chat and to ATMs with TellerChat (video tellers).
  - https://www.fnb-online.com/contact-us
- **Branches and ATMs:** https://www.fnb-online.com/atm-branch-locator
  - About 1,800 FNB ATMs; "Smart Deposit" ATMs take cash and checks without an envelope.
  - Filter the locator for "ATM with TellerChat".
- **Footprint:** PA, OH, MD, WV, NC, SC, VA and DC. $51B in assets; 355+ offices.
  - https://www.fnb-online.com/about-us/corporate-information/corporate-overview
- **Spanish:** https://www.fnb-online.com/spanish

---

## Gaps (searched for, not found or not published)

1. **Mortgage rates:** not in the regional rate feed or on any page. Every mortgage says "Check current rate with FNB".
2. **APRs not published:**
   - CashPlease ("affordable fixed rate" only).
   - Unsecured and secured lines of credit.
   - Secured installment loan.
   - All PHEAA and Sallie Mae student loans.
   - Business loans and lines.
3. **Early withdrawal penalty amounts:** not published for any CD (standard, Special, Savers Goal, Flex, IRA). The Truth-in-Savings disclosure and Deposit Account Agreement that would contain them were not found as public PDFs.
4. **Student Checking minimum opening deposit:** not stated anywhere.
5. **Kids, teen, minor or custodial savings; Christmas or holiday club; 529 plan:** none found. The only youth feature is FirstRate Savings' fee waiver for under-18s.
6. **Budgeting, savings-goal, round-up or auto-save tools:** the app has no described budgeting or goal tool. Online banking mentions "FNB budgeting tools" without detail. The closest features are CardGuard Spend Insights and the Savers Goal CD's required automatic transfer. The "Goal Advisor" (/personal/goal-advisor-results) is just the "How can we help?" topic navigation, not a planning tool.
7. **SmartSecured graduation to an unsecured card:** not published.
8. **Down payment assistance:** dollar amounts beyond the $5,000 closing cost grant (Community Uplift DPA amount) are not published. No state housing finance agency (PHFA, MD DHCD, etc.) programs on fnb-online.com.
9. **Homebuyer education:** which course or provider satisfies HomeOne or Home Possible is not named. FNB seminars run only in NC and MD; none in PA.
10. **Income limits** for Home Ownership, HomeReady, Home Possible and USDA: not published.
11. **Student-specific credit card, student founder or startup loan, microloan:** none. SBA 7(a) at FNB typically starts at $350,000.
12. **Auto refinance:** not offered on the site.
13. **Appointment booking steps:** the booking page is client-rendered, so the topic and time-slot flow could not be captured.
14. **"Earn up to $400" denovo promo:** the page exists, but no terms or disclosure are published.
15. **HSA eligibility (HDHP) rules:** not stated.
16. **Whether PSU student employees qualify for Workplace Banking:** not stated.
17. **PHEAA "potential interest rate rewards":** details not on fnb-online.com.

## Contradictions (FNB pages disagree)

1. **CD Special minimums:**
   - Fine print says a $2,500 minimum opening deposit.
   - "Key features" and "Product details" say a $5,000 minimum.
   - "Before you apply" says $5,000, or $10,000 for the 5- and 7-month terms.
   - The rate table says $10,000 (5 and 7 months) or $5,000 (others) to earn the promo APY.
   - Source: certificate-of-deposit-specials and deposit-specials.
2. **Scholarship count:**
   - The student banking pages say "Additional $5,000 scholarships" (plural).
   - The Official Rules say exactly **one** $5,000 First Prize ($20,000 total).
3. **Scholarship eligibility:**
   - The landing page says "18 or older … or have parental consent".
   - The Official Rules limit it to full-time undergraduates at accredited U.S. schools, or their parents.
4. **Student Checking ATM refunds:**
   - The May 2026 fee schedule and the product page say 4 refunds per cycle.
   - The July 2024 fee schedule (still hosted under /cra/2023/) says 2.
5. **eStyle Plus Checking:**
   - Listed in the July 2024 fee schedule and in the first-pass catalog.
   - The product page now returns 404, and it is absent from the May 2026 schedule.
6. **Business First Checking:**
   - The first pass attributed the $29 fee and 500 transactions to it. Those belong to **Small Business Financial Solutions**.
   - Business First is $85 a month.
   - The waiver is a "$50,000 minimum daily balance" in the fee schedule versus "$50,000 aggregated average ledger across up to four accounts" on the product page.
7. **ARM adjustments:**
   - "Key features" says "After fixed rate period, rate may adjust annually".
   - The body says rates "can adjust every six months".
8. **Home Possible:**
   - Described as for "low- to moderate-income borrowers".
   - The same page lists "No geographic or income restrictions on the borrower".
9. **Keystone Student Loans states:**
   - The student-loans hub omits Virginia.
   - The Keystone detail pages and the refinance-loans page include Virginia.
10. **Flex CD withdrawal rule:**
    - The first pass said "one penalty-free principal withdrawal per month, with conditions".
    - The product page says "Withdraw funds once per month with no early withdrawal penalty", with no conditions.
    - The savings compare page adds conditions: at least $500, deposited to FNB checking, 7-day rules.
11. **SmartSecured disclosure date:**
    - The PDF is titled 12.11.25 and shows a current 15.00% APR.
    - Page 2 says costs are "accurate as of September 2019".
12. **IRA Savings contribution limits:** the page cites outdated $5,500 / $6,500 limits and "begin distributions by age 72".
13. **eStore account count:** the Dec 2025 press release says "more than 40 accounts"; the March 2026 release says "more than 50 consumer and business products".

## Changes from the first pass

- **Corrected:**
  - SmartCash, SmartRewards and Penguins have a 12-month 0% intro APR.
  - Business First vs Small Business Financial Solutions.
  - eStyle Plus removed.
  - Scholarship prize count.
- **Filled in:**
  - All monthly fee amounts.
  - Overdraft and NSF fees.
  - ATM fees.
  - Deposit APYs and loan APRs as of 10/24/2026.
  - Card fees.
  - VA, USDA and Home Ownership Plus detail.
  - Student-loan limits.
  - SBA 7(a) and 504 detail.
- **Added:**
  - FirstRate 3.00% promo and $600 checking promo.
  - Workplace First Checking.
  - Community Uplift.
  - Conventional fixed, ARM and renovation mortgages.
  - Secured loan and line.
  - PA Forward Refinance.
  - Business savings and Rural Main Street grant.
  - Direct Deposit Switch and Payment Switch.
  - Mortgage calculators and homebuyer seminars.
  - Penn State page and international student banking.
  - Internships.
- **Kept (JSON category counts):**

  | Category | Entries |
  |---|---|
  | education_tool | 15 |
  | mortgage | 14 |
  | small_business | 10 |
  | checking | 7 |
  | savings | 5 |
  | cd | 5 |
  | credit_card | 5 |
  | personal_loan | 5 |
  | student_loan | 5 |
  | home_equity | 3 |
  | auto_loan | 1 |
  | **Total** | **75** |
