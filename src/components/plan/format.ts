import rawCatalog from "@/data/catalog.json";
import { timeSpan } from "@/lib/client/time";
import type { LifeEvent, Product, SpendingBucketId } from "@/types";

// Read-only view of Ben's catalog; names and notes render as published (FNB in text, #47).
const catalog = new Map((rawCatalog as unknown as Product[]).map((p) => [p.id, p]));

export const productById = (id?: string) => (id ? catalog.get(id) : undefined);

export const productName = (id: string) => {
  const name = catalog.get(id)?.name;
  return name
    ? name
    : id
        .replace(/^fnb-/, "")
        .replace(/-/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
};

export const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

// Time is always specific (DASHBOARD.md v2): the shared formatter, never "10+ years".
export const formatMonths = timeSpan;

export const whenLabel = (startMonth: number) => (startMonth <= 0 ? "Now" : `Month ${startMonth}`);

export function formatDate(iso: string) {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export const BUCKETS: Record<SpendingBucketId, { label: string; color: string }> = {
  fixed_costs: { label: "Fixed costs", color: "bg-chart-4" },
  emergency_fund: { label: "Safety cushion", color: "bg-chart-2" },
  goal_savings: { label: "Goals", color: "bg-chart-1" },
  guilt_free: { label: "Guilt-free", color: "bg-chart-3" },
};

export const LIFE_EVENTS: Record<LifeEvent, string> = {
  first_paycheck: "First paycheck",
  internship: "Internship",
  graduation: "Graduation",
  full_time_job: "Full-time job",
  turn_21: "Turning 21",
};
