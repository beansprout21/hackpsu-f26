// Display-only filter: the app never shows the bank's name or brand. Catalog and API text keep
// their original wording (Ben's data); this rewrites it at render time. URLs and ids are untouched
// because they are lowercase ("fnb-online.com", "fnb-home-ownership-program") and every rule is case-sensitive.

const VERBS =
  "declines|says|pairs|typically|underwrites|may|will|offers|charges|refunds|considers|requires|reports|waives|matches|uses";

const article = (nextWord: string, capital: boolean) => {
  const a = /^[aeiou]/i.test(nextWord) ? "an" : "a";
  return capital ? a[0].toUpperCase() + a.slice(1) : a;
};

export function scrub(text: string): string {
  if (!/FNB|First National Bank/.test(text)) return text;
  const startsUpper = /^[A-Z(]/.test(text);
  const out = text
    .replace(/\s*\(SWIFT [A-Z0-9]{8,11}\)/g, "")
    .replace(/First National Bank(?: of Pennsylvania)?/g, "FNB")
    .replace(/FNB Corporation Foundation/g, "the bank's foundation")
    .replace(/\bnon-FNB\b/g, "out-of-network")
    .replace(/\bNo FNB fee\b/g, "No bank fee")
    .replace(/\bFNB['’]s\b/g, "the bank's")
    // "an FNB banker" -> "a banker", "An FNB advisor" -> "An advisor"
    .replace(/\b([Aa])n? FNB (\w)/g, (_, a: string, next: string) => `${article(next, a === "A")} ${next}`)
    // FNB doing something: "FNB declines" -> "the bank declines"
    .replace(new RegExp(`\\bFNB (?=(${VERBS})\\b)`, "g"), "the bank ")
    // Brand in front of a name or noun: "FNB Student Checking", "FNB checking", "(FNB regional rates"
    .replace(/\bFNB (?=[\w$])/g, "")
    // Anything left, e.g. "with FNB" -> "with the bank"
    .replace(/\bFNB\b/g, "the bank")
    .replace(/(^|[.!?]\s+)the bank/g, (_, lead: string) => `${lead}The bank`)
    .replace(/\s{2,}/g, " ");
  return startsUpper && /^[a-z]/.test(out) ? out[0].toUpperCase() + out.slice(1) : out;
}

// Deep-copy any API object with every string passed through scrub().
export function scrubAll<T>(value: T): T {
  if (typeof value === "string") return scrub(value) as T;
  if (Array.isArray(value)) return value.map((v) => scrubAll(v)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, scrubAll(v)])) as T;
  }
  return value;
}
