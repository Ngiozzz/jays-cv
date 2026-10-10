// Cheapest option, for "From KES …" labels; null when nothing is on sale
export function lowestPrice(items: ReadonlyArray<{ price: number }>): number | null {
  return items.length ? Math.min(...items.map((item) => item.price)) : null;
}

export function priceByName(items: ReadonlyArray<{ name: string; price: number }>, name: string): number | null {
  return items.find((item) => item.name === name)?.price ?? null;
}

const DEFAULT_DRAFT_HOURS = 48;

// The first-draft time every package meets (the slowest one), used for "Draft in …" promises
export function standardDraftHours(packages: ReadonlyArray<{ firstDraftHours: number }>): number {
  return packages.length ? Math.max(...packages.map((p) => p.firstDraftHours)) : DEFAULT_DRAFT_HOURS;
}
