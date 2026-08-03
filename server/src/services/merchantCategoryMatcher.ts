export interface CategoryLike {
  id: number;
  name: string;
  type: string;
}

/**
 * Suggests a category id for a merchant name, matching ONLY among categories
 * of the given transaction type. Matching is case-insensitive: a category is
 * suggested if its name appears in the merchant string or vice versa.
 * Returns null when no match is found (caller falls back to the default
 * "Da categorizzare" category of the correct type).
 */
export function suggestCategory(
  merchant: string,
  type: "Income" | "Expense",
  userCategories: CategoryLike[]
): number | null {
  if (!merchant) return null;
  const norm = merchant.toLowerCase().trim();
  const candidates = userCategories.filter((c) => c.type === type);

  let best: { id: number; score: number } | null = null;
  for (const c of candidates) {
    const name = c.name.toLowerCase().trim();
    if (!name || name === "da categorizzare") continue;
    let score = 0;
    if (norm === name) score = 3;
    else if (norm.includes(name)) score = 2;
    else if (name.includes(norm) && norm.length >= 3) score = 1;
    if (score > 0 && (!best || score > best.score)) best = { id: c.id, score };
  }
  return best ? best.id : null;
}
