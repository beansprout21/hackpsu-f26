// FNB product catalog, validated once at module load. The engine and AI may only
// reference products returned from here; anything else is dropped (spec rule 1).
import { z } from "zod";
import rawCatalog from "@/data/catalog.json";
import { ProductSchema } from "@/types/schemas";
import type { Product } from "@/types";

function loadCatalog(raw: unknown): readonly Product[] {
  const parsed = z.array(ProductSchema).safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Invalid src/data/catalog.json: ${z.prettifyError(parsed.error)}`);
  }
  const seen = new Set<string>();
  for (const p of parsed.data) {
    if (seen.has(p.id)) throw new Error(`Invalid src/data/catalog.json: duplicate product id "${p.id}"`);
    seen.add(p.id);
  }
  return Object.freeze(parsed.data);
}

const catalog = loadCatalog(rawCatalog);
const byId = new Map(catalog.map((p) => [p.id, p]));

export function getCatalog(): readonly Product[] {
  return catalog;
}

export function getProduct(id: string): Product | undefined {
  return byId.get(id);
}

export function isCatalogId(id: string): boolean {
  return byId.has(id);
}
