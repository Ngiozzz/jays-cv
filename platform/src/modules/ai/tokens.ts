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

// ---------- Per person ----------

export type MemberAi = { role: "OWNER" | "WRITER"; aiEnabled: boolean; aiAllowance: number | null };

// Whether one person may run the AI: the owner always may; anyone else not while it's switched off
// for them, nor once their own monthly allowance is used up, unless the shared pool is open to them
export function memberAiStop(
  member: MemberAi,
  usedThisMonth: number,
  poolFallback: boolean,
): "off" | "allowance" | null {
  if (member.role === "OWNER") return null;
  if (!member.aiEnabled) return "off";
  if (member.aiAllowance !== null && usedThisMonth >= member.aiAllowance && !poolFallback) return "allowance";
  return null;
}

export const MEMBER_AI_MESSAGE = {
  off: "The AI is switched off for you. Ask the business owner to switch it on.",
  allowance: "You've used your AI tokens for this month. Ask the business owner for a bigger allowance.",
} as const;

// ---------- Pace ----------

// How fast the month's tokens are going, and when they run out at that pace
export function tokenPace(remaining: number, usedThisMonth: number, daysSoFar: number) {
  const perDay = daysSoFar > 0 ? Math.round(usedThisMonth / daysSoFar) : 0;
  const daysLeft = perDay > 0 ? Math.floor(remaining / perDay) : null;
  return { perDay, daysLeft };
}

// Tokens used on each day of the month so far, oldest first (days are Nairobi days)
export function usageByDay(
  entries: { delta: number; createdAt: Date }[],
  monthStart: Date,
  now: Date,
): { day: string; tokens: number }[] {
  const key = (date: Date) => date.toLocaleDateString("en-CA", { timeZone: "Africa/Nairobi" });
  const totals = new Map<string, number>();
  for (const entry of entries) totals.set(key(entry.createdAt), (totals.get(key(entry.createdAt)) ?? 0) - entry.delta);
  const days: { day: string; tokens: number }[] = [];
  for (let t = monthStart.getTime() + 3 * 3_600_000; t <= now.getTime() + 3 * 3_600_000; t += 86_400_000) {
    const day = new Date(t).toISOString().slice(0, 10);
    days.push({ day, tokens: totals.get(day) ?? 0 });
  }
  return days;
}

// The monthly allowance as typed ("200,000", "200000", or empty for no limit of their own)
export function parseAllowance(value: unknown): { ok: true; allowance: number | null } | { ok: false; error: string } {
  const text = String(value ?? "").replace(/[\s,]/g, "");
  if (text === "") return { ok: true, allowance: null };
  if (!/^\d+$/.test(text))
    return { ok: false, error: "Enter a whole number of tokens, or leave it empty for no limit." };
  const allowance = Number(text);
  if (allowance > 100_000_000) return { ok: false, error: "That's more than the business could ever have." };
  return { ok: true, allowance };
}
