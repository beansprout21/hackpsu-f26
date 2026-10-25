import { cn as mergeClasses } from "cn";

// The merger doesn't know our custom type scale (globals.css), so it reads "text-caption" as a
// color and drops it next to "text-success". Pull the scale classes out, merge the rest, then
// re-add the last scale class per variant prefix (e.g. "sm:").
const SCALE = /^((?:[\w-]+:)*)text-(caption|small|body|lead|title|display)$/;

type ClassInput = string | number | null | undefined | false | ClassInput[] | Record<string, unknown>;

function flatten(input: ClassInput, out: string[]) {
  if (!input) return;
  if (typeof input === "string" || typeof input === "number") out.push(String(input));
  else if (Array.isArray(input)) input.forEach((i) => flatten(i, out));
  else for (const [k, v] of Object.entries(input)) if (v) out.push(k);
}

export function cn(...inputs: ClassInput[]) {
  const tokens: string[] = [];
  inputs.forEach((i) => flatten(i, tokens));
  const all = tokens.join(" ").split(/\s+/).filter(Boolean);
  const sizes = new Map<string, string>();
  const rest: string[] = [];
  for (const t of all) {
    const m = SCALE.exec(t);
    if (m) {
      sizes.delete(m[1]);
      sizes.set(m[1], t);
    } else rest.push(t);
  }
  return [mergeClasses(rest.join(" ")), ...sizes.values()].filter(Boolean).join(" ");
}
