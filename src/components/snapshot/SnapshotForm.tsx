"use client";

// Money snapshot form (#10): steady income or lump sums, costs, savings, credit range, FNB customer.
import { useId } from "react";
import { Link2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  CREDIT_BANDS,
  FREQUENCY_LABELS,
  INCOME_OPTIONS,
  missingAnswers,
  newRowKey,
  snapshotFromDraft,
  type SnapshotDraft,
} from "./draft";
import { SurplusReadout } from "./SurplusReadout";

export const DISCLAIMER = "Educational prototype. Not financial advice. Nothing is stored unless you choose to share it with FNB.";

function Choice({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "min-h-11 rounded-xl border-2 px-4 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        on ? "border-primary bg-secondary" : "border-border hover:border-primary/60 hover:bg-secondary/60",
      )}
    >
      {children}
    </button>
  );
}

function MoneyField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground">$</span>
        <Input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          placeholder="0"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^0-9.,]/g, ""))}
          className="h-11 pl-7"
        />
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function SnapshotForm({
  draft,
  onChange,
  onSubmit,
  submitting,
}: {
  draft: SnapshotDraft;
  onChange: (next: SnapshotDraft) => void;
  onSubmit: () => void;
  submitting: boolean;
}) {
  const set = (patch: Partial<SnapshotDraft>) => onChange({ ...draft, ...patch });
  const missing = missingAnswers(draft);

  return (
    <form
      className="flex flex-col gap-8"
      onSubmit={(e) => {
        e.preventDefault();
        if (missing.length === 0) onSubmit();
      }}
    >
      <Button type="button" variant="outline" disabled className="h-11 justify-center gap-2">
        <Link2 aria-hidden /> Connect your bank (coming soon, via Plaid)
      </Button>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-lg font-semibold">Is your income steady each month?</legend>
        <div className="flex flex-wrap gap-2">
          <Choice on={draft.steady === true} onClick={() => set({ steady: true })}>
            Yes, steady
          </Choice>
          <Choice on={draft.steady === false} onClick={() => set({ steady: false })}>
            No, or it comes in waves
          </Choice>
        </div>

        {draft.steady === true && (
          <MoneyField
            label="Monthly take-home pay"
            hint="After taxes, what lands in your account each month."
            value={draft.monthlyTakeHome}
            onChange={(v) => set({ monthlyTakeHome: v })}
          />
        )}

        {draft.steady === false && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Add the money you get in lump sums. No money coming in yet is a fine place to start.
            </p>
            {draft.rows.map((row) => {
              const option = INCOME_OPTIONS.find((o) => o.kind === row.kind)!;
              return (
                <div key={row.key} className="flex flex-col gap-2 rounded-xl border border-border p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{option.label}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Remove ${option.label}`}
                      onClick={() => set({ rows: draft.rows.filter((r) => r.key !== row.key) })}
                    >
                      <X aria-hidden />
                    </Button>
                  </div>
                  <MoneyField
                    label="Amount"
                    value={row.amount}
                    onChange={(v) => set({ rows: draft.rows.map((r) => (r.key === row.key ? { ...r, amount: v } : r)) })}
                  />
                  {option.frequencies.length > 1 ? (
                    <div className="flex flex-wrap gap-2" role="group" aria-label={`How often for ${option.label}`}>
                      {option.frequencies.map((f) => (
                        <Choice
                          key={f}
                          on={row.frequency === f}
                          onClick={() => set({ rows: draft.rows.map((r) => (r.key === row.key ? { ...r, frequency: f } : r)) })}
                        >
                          {FREQUENCY_LABELS[f]}
                        </Choice>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">{FREQUENCY_LABELS[option.frequencies[0]]}</p>
                  )}
                </div>
              );
            })}
            <div className="flex flex-wrap gap-2">
              {INCOME_OPTIONS.map((o) => (
                <Button
                  key={o.kind}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    set({ rows: [...draft.rows, { key: newRowKey(), kind: o.kind, frequency: o.frequencies[0], amount: "" }] })
                  }
                >
                  <Plus aria-hidden /> {o.label}
                </Button>
              ))}
            </div>
          </div>
        )}
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-3">
        <legend className="mb-3 text-lg font-semibold">What goes out, and what you have</legend>
        <MoneyField
          label="Fixed costs a month"
          hint="Rent, utilities, phone, groceries, insurance."
          value={draft.fixedCosts}
          onChange={(v) => set({ fixedCosts: v })}
        />
        <MoneyField
          label="Debt payments a month"
          hint="Loan payments, card minimums."
          value={draft.debtPayments}
          onChange={(v) => set({ debtPayments: v })}
        />
        <MoneyField label="Savings today" hint="Money you can reach easily." value={draft.savings} onChange={(v) => set({ savings: v })} />
      </fieldset>

      <SurplusReadout snapshot={snapshotFromDraft(draft)} />

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-lg font-semibold">Your credit range, as far as you know</legend>
        <div className="flex flex-wrap gap-2">
          {CREDIT_BANDS.map((b) => (
            <Choice key={b.id} on={draft.creditBand === b.id} onClick={() => set({ creditBand: b.id })}>
              {b.label}
            </Choice>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-lg font-semibold">Already bank with FNB?</legend>
        <div className="flex flex-wrap gap-2">
          <Choice on={draft.isFnbCustomer} onClick={() => set({ isFnbCustomer: true })}>
            Yes
          </Choice>
          <Choice on={!draft.isFnbCustomer} onClick={() => set({ isFnbCustomer: false })}>
            Not yet
          </Choice>
        </div>
      </fieldset>

      <div className="flex flex-col gap-3">
        {missing.length > 0 && (
          <p className="text-sm text-muted-foreground" aria-live="polite">
            Almost there: tell Sprout {missing.join(", ")}.
          </p>
        )}
        <Button type="submit" size="lg" className="h-12 text-base" disabled={missing.length > 0 || submitting}>
          Build my plan
        </Button>
        <p className="text-center text-xs text-muted-foreground">{DISCLAIMER}</p>
      </div>
    </form>
  );
}
