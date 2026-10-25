// Banker dashboard display helpers. Dates render in Eastern time so server and banker agree.
export const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/New_York" });

// Small pill badge (#181): existing tokens only.
export const BADGE = "rounded-full bg-muted px-2 py-0.5 text-caption text-muted-foreground";

// The engine puts the fee line first in termsToKnow (fit-first, fee-transparent); other first terms are not fees.
export const feeLine = (terms: string[]) => (terms[0] && /fee|free|charge|penalt|waiv|no cost/i.test(terms[0]) ? terms[0] : null);

export const INCOME_KIND: Record<string, string> = {
  job: "Job",
  work_study: "Work-study",
  family: "Family support",
  aid_refund: "Aid refund",
  scholarship: "Scholarship",
  summer_savings: "Summer savings",
  gig: "Gig work",
  other: "Other",
};

export const FREQUENCY: Record<string, string> = { monthly: "/mo", per_semester: " per semester", one_time: " one-time" };
