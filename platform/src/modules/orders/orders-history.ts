import type { Prisma } from "@/generated/prisma/client";
import { DAY } from "./orders.rules";
import type { OrderFilters } from "./orders-list";
import { parseOrderNumber } from "./tracking";

// Admin → Orders: delivered orders pile up over the years, so they're filtered, counted and paged by
// the database instead of being loaded whole. These are the same rules as filterOrders (orders-list.ts)
// for an order with no deadline running, written as a database query. Pure: builds the query only.

export const PAGE_SIZE = 50;

export type Viewer = {
  memberId: string;
  orderPrefix: string;
  // The owner sees money (and searches M-Pesa codes)
  money: boolean;
  // The owner sees every client's phone; a writer only those on their own orders
  allPhones: boolean;
};

// "0712345678", "254712…", "712 345" → the stored form "0712 345 678" (or the part typed)
export function storedPhonePart(digits: string): string {
  const local = digits.startsWith("254") ? `0${digits.slice(3)}` : digits;
  if (!local.startsWith("0")) return local;
  return [local.slice(0, 4), local.slice(4, 7), local.slice(7)].filter(Boolean).join(" ");
}

function searchWhere(q: string, viewer: Viewer): Prisma.OrderWhereInput {
  const text = { contains: q, mode: "insensitive" as const };
  const any: Prisma.OrderWhereInput[] = [{ clientName: text }, { itemName: text }, { writer: { displayName: text } }];
  const number = parseOrderNumber(q, viewer.orderPrefix);
  if (number !== null) any.push({ number });
  if (viewer.money) any.push({ payments: { some: { status: "CONFIRMED", receipt: text } } });
  const digits = q.replace(/\D/g, "");
  if (digits.length >= 4) {
    const phone: Prisma.OrderWhereInput = { clientPhone: { contains: storedPhonePart(digits) } };
    any.push(viewer.allPhones ? phone : { AND: [phone, { writerId: viewer.memberId }] });
  }
  return { OR: any };
}

// Which delivered orders the current view shows, or null when it can't show any (e.g. the
// "Writing" tab, or "Due within 24h": a delivered order has no deadline)
export function deliveredWhere(filters: OrderFilters, viewer: Viewer, now: Date): Prisma.OrderWhereInput | null {
  if (!["all", "delivered", "mine"].includes(filters.tab)) return null;
  if (filters.quick && filters.quick !== "paid") return null;
  if (filters.due) return null;
  if (filters.writer === "open") return null;

  const and: Prisma.OrderWhereInput[] = [{ status: "DELIVERED" }];
  if (filters.tab === "mine" || filters.writer === "mine") and.push({ writerId: viewer.memberId });
  else if (filters.writer) and.push({ writerId: filters.writer });
  if (filters.pkg) and.push(filters.pkg === "single" ? { packageId: null } : { package: { shortName: filters.pkg } });
  if (filters.pay) and.push({ paidAt: filters.pay === "paid" ? { not: null } : null });
  if (filters.quick === "paid") and.push({ paidAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) } });
  if (filters.placed === "today")
    and.push({ createdAt: { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) } });
  if (filters.placed === "7d" || filters.placed === "30d")
    and.push({ createdAt: { gte: new Date(now.getTime() - (filters.placed === "7d" ? 7 : 30) * DAY) } });
  if (filters.q) and.push(searchWhere(filters.q, viewer));
  return { AND: and };
}

// Delivered orders have no deadline, so "Due soonest" lists them newest first (as filterOrders does)
export function deliveredOrderBy(sort: OrderFilters["sort"]): Prisma.OrderOrderByWithRelationInput {
  if (sort === "oldest") return { createdAt: "asc" };
  if (sort === "amount") return { amount: "desc" };
  return { createdAt: "desc" };
}

export const pageCount = (total: number) => Math.max(1, Math.ceil(total / PAGE_SIZE));

export function parsePage(value: unknown): number {
  const page = typeof value === "string" ? Number.parseInt(value, 10) : 1;
  return Number.isFinite(page) && page > 0 ? Math.min(page, 10_000) : 1;
}
