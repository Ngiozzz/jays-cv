// The owner sees AI as a token balance only, never as money.

export type TokenBalance = { remaining: number; granted: number; percentLeft: number; low: boolean };

export function tokenBalance(remaining: number, granted: number, warnPct: number): TokenBalance {
  const percentLeft = granted > 0 ? Math.max(0, Math.round((remaining / granted) * 100)) : 0;
  return { remaining, granted, percentLeft, low: percentLeft <= warnPct };
}
