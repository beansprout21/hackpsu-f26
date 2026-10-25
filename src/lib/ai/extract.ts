// Uploaded document -> ExtractedSnapshot (Contracts v2.3, POST /api/extract). The file lives in memory for
// this one request: it is sent to the Anthropic API and never stored or logged, and neither is what we read.
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { ContentBlockParam } from "@anthropic-ai/sdk/resources/messages/messages";
import type { ExtractedSnapshot, IncomeSource } from "@/types";
import { CreditBandSchema, ExtractedSnapshotSchema, IncomeSourceSchema } from "@/types/schemas";
import { getClient, getModel } from "./client";

export const EXTRACT_TIMEOUT_MS = 25_000;

export const EXTRACT_MEDIA_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/webp"] as const;
export type ExtractMediaType = (typeof EXTRACT_MEDIA_TYPES)[number];

const EXTRACT_SYSTEM = [
  "You read one personal finance document (bank statement, pay stub, credit card statement, or credit report) for Sprout, an educational budgeting prototype built for FNB.",
  "Your output pre-fills a form the user reviews, so accuracy beats completeness.",
  "Rules:",
  "- Use only values printed in the document. If a value is not shown, return null. Never estimate, infer, or average across missing months.",
  "- All money values are US dollars per month, except savingsBalance (a balance) and one-time or per-semester income amounts.",
  "- incomeSources: money coming IN to the person (paychecks, direct deposits, family transfers, aid refunds, scholarships, gig payouts). One entry per distinct source.",
  "  kind: job (employer pay), work_study, family, aid_refund, scholarship, summer_savings, gig, other.",
  "  frequency: monthly for recurring pay, per_semester for aid refunds and scholarships paid per term, one_time otherwise.",
  "  amount: exactly as printed for one occurrence (one paycheck, one transfer). Do not convert or total it; set payPeriod instead and the app does the math.",
  "  payPeriod: how often recurring pay arrives as printed (weekly, biweekly, semimonthly, monthly), or null when not recurring or not shown.",
  "  Use take-home (net) pay when a pay stub shows both gross and net.",
  "  Transfers between the person's own accounts are not income.",
  "- monthlyFixedCosts: recurring essentials paid each month (rent, utilities, phone, insurance, groceries, campus meal plan) only when they appear as payments in the document. Never count restaurants, takeout, delivery apps or coffee shops as fixed costs.",
  "- monthlyDebtPayments: loan payments and credit card minimum payments due each month, only when shown.",
  "- savingsBalance: the ending balance of a savings account, or of checking if that is the only account shown.",
  "- creditBand: only from a credit report with a score. 300-579 building, 580-669 fair, 670-739 good, 740-850 excellent. Otherwise null.",
  "- confidence: high when the document is clear and complete, medium when some values were unclear, low when it is hard to read or not a finance document.",
  "- notes: at most 4 short, plain sentences about what you read and what you left empty. Do no arithmetic in notes. Never include account numbers, card numbers, names, addresses, or employer names.",
  "- If the file is not a personal finance document, return documentKind other, empty incomeSources, nulls, confidence low, and one note saying so.",
].join("\n");

// What the model returns. Kept loose (no min/max) for structured outputs; we clean it up before
// validating against the contract schema.
const AiExtractSchema = z.object({
  documentKind: z.enum(["bank_statement", "pay_stub", "credit_card_statement", "credit_report", "other"]),
  incomeSources: z.array(
    IncomeSourceSchema.pick({ kind: true, frequency: true }).extend({
      amount: z.number(),
      payPeriod: z.enum(["weekly", "biweekly", "semimonthly", "monthly"]).nullable(),
    }),
  ),
  monthlyFixedCosts: z.number().nullable(),
  monthlyDebtPayments: z.number().nullable(),
  savingsBalance: z.number().nullable(),
  creditBand: CreditBandSchema.nullable(),
  confidence: z.enum(["high", "medium", "low"]),
  notes: z.array(z.string()),
});
type AiExtract = z.infer<typeof AiExtractSchema>;

// Paychecks per month, so the monthly figure is computed here rather than by the model.
const PER_MONTH = { weekly: 52 / 12, biweekly: 26 / 12, semimonthly: 2, monthly: 1 } as const;

const money = (n: number | null) => (n === null || !Number.isFinite(n) || n < 0 ? null : Math.round(n * 100) / 100);

// Defense in depth for "never account numbers": drop any run of 4+ digits except a year (amounts survive
// because they use "," and "."), clip length, keep at most 4.
const scrubDigits = (run: string) => {
  const digits = run.replace(/\D/g, "");
  return digits.length >= 4 && !/^(19|20)\d\d$/.test(digits) ? "[number removed]" : run;
};
const cleanNotes = (notes: string[]) =>
  notes
    .map((n) => n.replace(/\d[\d\s-]{2,}\d(?![\d.,])/g, scrubDigits))
    .map((n) => n.replace(/\s+/g, " ").trim().slice(0, 200))
    .filter(Boolean)
    .slice(0, 4);

function dedupeIncomes(sources: IncomeSource[]): IncomeSource[] {
  const seen = new Set<string>();
  return sources.filter((s) => {
    const key = `${s.kind}|${s.frequency}|${s.amount}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sanitize(ai: AiExtract): ExtractedSnapshot {
  const incomeSources = dedupeIncomes(
    ai.incomeSources
      .map(({ payPeriod, ...s }) => ({
        ...s,
        amount: money(s.frequency === "monthly" && payPeriod ? s.amount * PER_MONTH[payPeriod] : s.amount) ?? 0,
      }))
      .filter((s) => s.amount > 0),
  );
  return ExtractedSnapshotSchema.parse({
    documentKind: ai.documentKind,
    incomeSources,
    monthlyFixedCosts: money(ai.monthlyFixedCosts),
    monthlyDebtPayments: money(ai.monthlyDebtPayments),
    savingsBalance: money(ai.savingsBalance),
    creditBand: ai.documentKind === "credit_report" ? ai.creditBand : null,
    confidence: ai.confidence,
    notes: cleanNotes(ai.notes),
  });
}

function fileBlock(data: string, mediaType: ExtractMediaType): ContentBlockParam {
  return mediaType === "application/pdf"
    ? { type: "document", source: { type: "base64", media_type: mediaType, data } }
    : { type: "image", source: { type: "base64", media_type: mediaType, data } };
}

// Throws on any failure (no key, AI disabled, timeout, refusal, invalid output); the route maps every
// failure to the contract's fallback error and logs only a fixed label.
export async function extractSnapshot(bytes: ArrayBuffer, mediaType: ExtractMediaType): Promise<ExtractedSnapshot> {
  const client = getClient();
  if (!client) throw new Error("ai unavailable");
  const response = await client.messages.parse(
    {
      model: getModel(),
      max_tokens: 4000,
      output_config: { effort: "low", format: zodOutputFormat(AiExtractSchema) },
      system: EXTRACT_SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            fileBlock(Buffer.from(bytes).toString("base64"), mediaType),
            { type: "text", text: "Read this document and fill in the fields. Follow the rules exactly." },
          ],
        },
      ],
    },
    { timeout: EXTRACT_TIMEOUT_MS, maxRetries: 0, signal: AbortSignal.timeout(EXTRACT_TIMEOUT_MS) },
  );
  if (response.stop_reason !== "end_turn") throw new Error(`stop_reason=${response.stop_reason}`);
  if (!response.parsed_output) throw new Error("no parsed output");
  return sanitize(response.parsed_output);
}
