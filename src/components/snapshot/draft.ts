// Snapshot form draft <-> FinancialSnapshot (Contracts v2), following Ethan's approved addendum on #10.
import type { CreditBand, ExtractedSnapshot, FinancialSnapshot, IncomeFrequency, IncomeKind } from "@/types";
import { FinancialSnapshotSchema } from "@/types/schemas";

export interface IncomeOption {
  id: string; // several options can share one IncomeKind (e.g. three kinds of family money)
  kind: IncomeKind;
  label: string;
  frequencies: IncomeFrequency[];
  addable?: false; // false: only used to label rows filled from a document, not offered as an "add" button
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
  { id: "job", kind: "job", label: "Paycheck", frequencies: ["monthly", "one_time"], addable: false },
  { id: "work_study", kind: "work_study", label: "Work-study", frequencies: ["monthly", "per_semester"], addable: false },
];

export const optionById = (id: string) =>
  INCOME_OPTIONS.find((o) => o.id === id) ?? INCOME_OPTIONS.find((o) => o.id === "other")!;
const optionForKind = (kind: IncomeKind) => INCOME_OPTIONS.find((o) => o.kind === kind) ?? optionById("other");

// #163: shown under the income math wherever one-time or per-semester money is converted to a monthly amount.
export const INCOME_SPREAD_NOTE =
  "One-time money (like summer savings) is spread over the 9-month school year; per-semester money over each 4-month semester.";

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
  fromDoc?: boolean; // filled from an uploaded document; cleared when the user edits the row
}

// Single-value fields an uploaded document can fill.
export type DocField = "monthlyTakeHome" | "fixedCosts" | "debtPayments" | "savings" | "creditBand";

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
  fromDoc: Partial<Record<DocField, boolean>>; // drives the "From your document" marker
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
  fromDoc: {},
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
    fromDoc: {},
  };
}

const wholeDollars = (n: number) => String(Math.round(n));

// Merge one uploaded document into the draft (Contracts v2.3): fill only fields that are still empty, so the
// user's own entries and earlier documents win; add incomes that aren't already listed (same kind, frequency,
// and amount). Pure, so it is safe as a state updater.
export function applyExtraction(d: SnapshotDraft, ex: ExtractedSnapshot): SnapshotDraft {
  const next: SnapshotDraft = { ...d, fromDoc: { ...d.fromDoc } };
  const fill = (field: Exclude<DocField, "creditBand">, value: number | null) => {
    if (value === null || next[field].trim() !== "") return;
    next[field] = wholeDollars(value);
    next.fromDoc[field] = true;
  };

  const incomes = ex.incomeSources.filter((s) => s.amount > 0);
  if (incomes.length > 0) {
    if (next.steady === null) next.steady = incomes.every((s) => s.kind === "job" && s.frequency === "monthly");
    if (next.steady) {
      const pay = incomes.filter((s) => s.kind === "job" && s.frequency === "monthly").reduce((sum, s) => sum + s.amount, 0);
      fill("monthlyTakeHome", pay > 0 ? pay : null);
    } else {
      const listed = new Set(next.rows.map((r) => `${r.kind}|${r.frequency}|${Math.round(toAmount(r.amount))}`));
      const added = incomes
        .filter((s) => !listed.has(`${s.kind}|${s.frequency}|${Math.round(s.amount)}`))
        .map((s) => ({ key: newRowKey(), optionId: optionForKind(s.kind).id, kind: s.kind, frequency: s.frequency, amount: wholeDollars(s.amount), fromDoc: true }));
      if (added.length > 0) next.rows = [...next.rows, ...added];
      next.noIncome = false;
    }
  }

  fill("fixedCosts", ex.monthlyFixedCosts);
  fill("debtPayments", ex.monthlyDebtPayments);
  fill("savings", ex.savingsBalance);
  if (ex.creditBand !== null && next.creditBand === null) {
    next.creditBand = ex.creditBand;
    next.fromDoc.creditBand = true;
  }
  return next;
}

// True when a document gave Sprout at least one value to fill in.
export const hasValues = (ex: ExtractedSnapshot) =>
  ex.incomeSources.length > 0 || [ex.monthlyFixedCosts, ex.monthlyDebtPayments, ex.savingsBalance, ex.creditBand].some((v) => v !== null);

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
