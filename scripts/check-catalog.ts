// Loads and validates the catalog, then prints product count per goal tag.
// Run: npx tsx scripts/check-catalog.ts
import { getCatalog } from "../src/lib/server/catalog";
import { GoalIdSchema } from "../src/types/schemas";

const REQUIRED_IDS = [
  "student-checking",
  "smartsecured-card",
  "savers-goal-cd",
  "firstrate-savings",
  "fnb-home-ownership-program",
  "homeone-mortgage",
  "fha-mortgage",
  "cd-special",
  "free-small-business-checking",
  "learning-center",
];

const catalog = getCatalog();
const ids = new Set(catalog.map((p) => p.id));
const missing = REQUIRED_IDS.filter((id) => !ids.has(id));

console.log(`catalog: ${catalog.length} products (valid)`);
for (const goal of GoalIdSchema.options) {
  const matches = catalog.filter((p) => p.goalTags.includes(goal)).map((p) => p.id);
  console.log(`  ${goal.padEnd(16)} ${String(matches.length).padStart(2)}  ${matches.join(", ")}`);
}
const published = catalog.filter((p) => p.rateNote !== "Check current rate with FNB" && p.rateNote !== "Free");
console.log(`published rates: ${published.map((p) => `${p.id} (${p.rateNote})`).join("; ")}`);

if (catalog.length < 15 || catalog.length > 100) {
  console.error(`FAIL: expected 15 to 100 products, got ${catalog.length}`);
  process.exit(1);
}
if (missing.length) {
  console.error(`FAIL: missing required ids: ${missing.join(", ")}`);
  process.exit(1);
}
console.log("ok: all required ids present");
