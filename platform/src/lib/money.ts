// Money is whole Kenyan shillings everywhere (integers), so no rounding errors can creep in

export function formatNumber(amount: number): string {
  return amount.toLocaleString("en-KE");
}

export function formatKes(amount: number): string {
  return `KES ${formatNumber(amount)}`;
}

export function assertWholeShillings(amount: number): number {
  if (!Number.isSafeInteger(amount) || amount < 0) {
    throw new Error(`Amounts must be whole, non-negative shillings (got ${amount})`);
  }
  return amount;
}
