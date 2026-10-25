// Snapshot form draft <-> FinancialSnapshot (Contracts v2), following Ethan's approved addendum on #10.
import type { CreditBand, FinancialSnapshot, IncomeFrequency, IncomeKind } from "@/types";
import { FinancialSnapshotSchema } from "@/types/schemas";

export interface IncomeOption {
  id: string; // several options can share one IncomeKind (e.g. three kinds of family money)
  kind: IncomeKind;
  label: string;
  frequencies: IncomeFrequency[];
}

// "No / irregular" income rows; each row becomes one IncomeSource. The first option per kind is
// the default label when a saved snapshot is turned back into rows.
export const INCOME_OPTIONS: IncomeOption[] = [
  { id: "aid_refund", kind: "aid_refund", label: "Aid refund", frequencies: ["per_semester"] },
  { id: "summer_savings", kind: "summer_savings", label: "Summer earnings", frequencies: ["one_time"] },
  { id: "family", kind: "family", label: "Family support", frequencies: ["monthly", "per_semester", "one_time"] },
  { id: "parents_spending", kind: "family", label: "Spending money from parents", frequencies: ["monthly", "per_semester", "one_time"] },
  { id: "gifts", kind: "family", label: "Birthday money and gifts", frequencies: ["one_time"] },
  { id: "scholarship", kind: "scholarship", label: "Scholarship", frequencies: ["per_semester", "one_time"] },
  { id: "gig", kind: "gig", label: "Gig or side work", frequencies: ["monthly", "one_time"] },
  { id: "other", kind: "other", label: "Other", frequencies: ["monthly", "per_semester", "one_time"] },
];

export const optionById = (id: string) => INCOME_OPTIONS.find((o) => o.id === id) ?? INCOME_OPTIONS[INCOME_OPTIONS.length - 1];
const optionForKind = (kind: IncomeKind) => INCOME_OPTIONS.find((o) => o.kind === kind) ?? optionById("other");

export const FREQUENCY_LABELS: Record<IncomeFrequency, string> = {
  monthly: "a month",
  per_semester: "a semester",
  one_time: "one time",
};

// Shown under an amount so the /4 and /9 in the readout make sense.
export const FREQUENCY_HINTS: Record<IncomeFrequency, string | undefined> = {
  monthly: undefined,
  per_semester: "Spread over about 4 months.",
  one_time: "Spread over your 9-month school year.",
};

export const SCOPE_LINE = "Only count money that's yours to spend. Leave out tuition, loans, or rent your parents pay directly.";

export const CREDIT_BANDS: { id: CreditBand; label: string }[] = [
  { id: "building", label: "Building" },
  { id: "fair", label: "Fair" },
  { id: "good", label: "Good" },
  { id: "excellent", label: "Excellent" },
  { id: "unsure", label: "No idea" },
];

export interface IncomeRow {
  key: string;
  optionId: string;
  kind: IncomeKind;
  frequency: IncomeFrequency;
  amount: string;
}

export interface SnapshotDraft {
  steady: boolean | null;
  monthlyTakeHome: string;
  noIncome: boolean; // "No money coming in right now": empty incomeSources, on purpose
  rows: IncomeRow[];
  fixedCosts: string;
  debtPayments: string;
  savings: string;
  creditBand: CreditBand | null;
  isFnbCustomer: boolean;
}

export const EMPTY_DRAFT: SnapshotDraft = {
  steady: null,
  monthlyTakeHome: "",
  noIncome: false,
  rows: [],
  fixedCosts: "",
  debtPayments: "",
  savings: "",
  creditBand: null,
  isFnbCustomer: false,
};

let rowCounter = 0;
export const newRowKey = () => `row-${++rowCounter}`;

export const newRow = (o: IncomeOption): IncomeRow => ({ key: newRowKey(), optionId: o.id, kind: o.kind, frequency: o.frequencies[0], amount: "" });

// "1,200" or "$1,200.50" -> 1200.5; blank or invalid -> 0.
export function toAmount(raw: string): number {
  const n = Number(raw.replace(/[$,\s]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function draftFromSnapshot(s: FinancialSnapshot): SnapshotDraft {
  const job = s.hasSteadyIncome ? s.incomeSources.find((i) => i.kind === "job" && i.frequency === "monthly") : undefined;
  return {
    steady: s.hasSteadyIncome,
    monthlyTakeHome: job ? String(job.amount) : "",
    noIncome: !s.hasSteadyIncome && s.incomeSources.length === 0,
    rows: s.hasSteadyIncome
      ? []
      : s.incomeSources.map((i) => ({
          key: newRowKey(),
          optionId: optionForKind(i.kind).id,
          kind: i.kind,
          frequency: i.frequency,
          amount: String(i.amount),
        })),
    fixedCosts: String(s.monthlyFixedCosts),
    debtPayments: String(s.monthlyDebtPayments),
    savings: String(s.savingsBalance),
    creditBand: s.creditBand,
    isFnbCustomer: s.isFnbCustomer,
  };
}

// Rows that count toward income, in incomeSources order (the readout labels lines with these).
export const countedRows = (d: SnapshotDraft) =>
  d.steady === false && !d.noIncome ? d.rows.filter((r) => toAmount(r.amount) > 0) : [];

// Always returns a FinancialSnapshot-shaped value (zeros for blanks) so the live readout can run.
export function snapshotFromDraft(d: SnapshotDraft): FinancialSnapshot {
  const incomeSources =
    d.steady === true
      ? toAmount(d.monthlyTakeHome) > 0
        ? [{ kind: "job" as const, amount: toAmount(d.monthlyTakeHome), frequency: "monthly" as const }]
        : []
      : countedRows(d).map((r) => ({ kind: r.kind, amount: toAmount(r.amount), frequency: r.frequency }));
  return {
    hasSteadyIncome: d.steady === true,
    incomeSources,
    monthlyFixedCosts: toAmount(d.fixedCosts),
    monthlyDebtPayments: toAmount(d.debtPayments),
    savingsBalance: toAmount(d.savings),
    creditBand: d.creditBand ?? "unsure",
    isFnbCustomer: d.isFnbCustomer,
  };
}

// What still needs an answer before Sprout can build the plan (empty = ready).
export function missingAnswers(d: SnapshotDraft): string[] {
  const missing: string[] = [];
  if (d.steady === null) missing.push("whether your income is steady");
  if (d.steady === true && toAmount(d.monthlyTakeHome) <= 0) missing.push("your monthly take-home pay");
  if (d.fixedCosts.trim() === "") missing.push("your monthly fixed costs");
  if (d.creditBand === null) missing.push("your credit range");
  return missing;
}

export function validSnapshot(d: SnapshotDraft) {
  return FinancialSnapshotSchema.safeParse(snapshotFromDraft(d));
}
