// Pure money rules for the Finance screen. Amounts are whole shillings (see lib/money.ts).

export const PERIODS = ["month", "30", "all"] as const;
export type Period = (typeof PERIODS)[number];

export const PERIOD_LABEL: Record<Period, string> = {
  month: "this month",
  "30": "in the last 30 days",
  all: "since the start",
};

export function parsePeriod(value: unknown): Period {
  return PERIODS.includes(value as Period) ? (value as Period) : "month";
}

// Kenya has no daylight saving, so Nairobi is always three hours ahead of UTC
const NAIROBI_OFFSET_MS = 3 * 3_600_000;
const DAY_MS = 86_400_000;

// When a period starts, as a moment in time; null means "since the start"
export function periodStart(period: Period, now: Date = new Date()): Date | null {
  if (period === "all") return null;
  if (period === "30") return new Date(now.getTime() - 30 * DAY_MS);
  const local = new Date(now.getTime() + NAIROBI_OFFSET_MS);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1) - NAIROBI_OFFSET_MS);
}

// A writer's share of an order they delivered; the owner writing their own CVs keeps it all
export function writerShare(orderAmount: number, payPercent: number, writerIsOwner: boolean): number {
  if (writerIsOwner) return 0;
  return Math.round((orderAmount * payPercent) / 100);
}

export function percentOf(part: number, whole: number): number {
  return whole ? Math.round((part / whole) * 100) : 0;
}

export type PaidLine = { amount: number; fee: number; itemName: string };

export function summarise(payments: PaidLine[], writerPay: number) {
  const takings = payments.reduce((sum, p) => sum + p.amount, 0);
  const fees = payments.reduce((sum, p) => sum + p.fee, 0);
  const byItem = new Map<string, { amount: number; count: number }>();
  for (const p of payments) {
    const entry = byItem.get(p.itemName) ?? { amount: 0, count: 0 };
    byItem.set(p.itemName, { amount: entry.amount + p.amount, count: entry.count + 1 });
  }
  return {
    takings,
    fees,
    writerPay,
    keep: takings - fees - writerPay,
    byPackage: [...byItem.entries()]
      .map(([name, entry]) => ({ name, ...entry }))
      .sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name)),
  };
}

// Owed overall = earned on every delivered CV minus every payout recorded; never below zero
export function owedAmount(earned: number, paidOut: number): number {
  return Math.max(0, earned - paidOut);
}

export const CHANNEL_LABEL = {
  MPESA_STK: "M-Pesa prompt",
  MPESA_PAYBILL: "Paybill",
  MANUAL: "Recorded by hand",
} as const;

export function orderNumberLabel(prefix: string, number: number): string {
  return `${prefix}-${number}`;
}

export function csvCell(value: string | number | null | undefined): string {
  const text = String(value ?? "");
  // A leading = + - @ makes Excel run the cell as a formula; a quote mark stops that
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function toCsv(rows: (string | number | null | undefined)[][]): string {
  // The BOM makes Excel read the file as UTF-8
  return `﻿${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`;
}
