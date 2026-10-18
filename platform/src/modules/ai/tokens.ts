// The owner sees AI as a token balance only, never as money.

// paused: the platform owner switched this business's AI off from the Command Center
export type TokenBalance = { remaining: number; granted: number; percentLeft: number; low: boolean; paused: boolean };

export function tokenBalance(remaining: number, granted: number, warnPct: number, paused = false): TokenBalance {
  const percentLeft = granted > 0 ? Math.max(0, Math.round((remaining / granted) * 100)) : 0;
  return { remaining, granted, percentLeft, low: percentLeft <= warnPct, paused };
}

// The AI may run only while it isn't paused and tokens are left
export function aiStopped(balance: TokenBalance): "paused" | "empty" | null {
  if (balance.paused) return "paused";
  return balance.remaining <= 0 ? "empty" : null;
}

export const AI_PAUSED_MESSAGE = "The AI is paused for now. Ask your developer to switch it back on.";
