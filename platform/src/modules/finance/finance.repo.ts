import "server-only";
import { tenantDb } from "@/lib/tenant-db";

const since = (start: Date | null) => (start ? { gte: start } : undefined);

// Confirmed payments that belong to an order, newest first
export function findOrderPayments(tenantId: string, start: Date | null) {
  return tenantDb(tenantId).payment.findMany({
    where: { status: "CONFIRMED", orderId: { not: null }, confirmedAt: since(start) },
    orderBy: { confirmedAt: "desc" },
    select: {
      id: true,
      amount: true,
      fee: true,
      channel: true,
      receipt: true,
      accountReference: true,
      confirmedAt: true,
      order: { select: { number: true, clientName: true, itemName: true } },
    },
  });
}

// Money that reached the Paybill but isn't tied to an order (a name typed as the account, or not from the website)
export function sumUnlinkedPayments(tenantId: string, start: Date | null) {
  return tenantDb(tenantId).payment.aggregate({
    where: { status: "CONFIRMED", orderId: null, confirmedAt: since(start) },
    _count: true,
    _sum: { amount: true },
  });
}

// Every delivered order with a writer: writer pay is earned on delivery
export function findDeliveredOrders(tenantId: string) {
  return tenantDb(tenantId).order.findMany({
    where: { status: "DELIVERED", writerId: { not: null } },
    select: { amount: true, deliveredAt: true, writerId: true },
  });
}

export function findWriters(tenantId: string) {
  return tenantDb(tenantId).membership.findMany({
    where: { role: "WRITER" },
    orderBy: { joinedAt: "asc" },
    select: { id: true, displayName: true, status: true, payPercent: true },
  });
}

export function sumPayoutsByWriter(tenantId: string) {
  return tenantDb(tenantId).writerPayout.groupBy({ by: ["writerId"], _sum: { amount: true } });
}

export function findRecentPayouts(tenantId: string, take: number) {
  return tenantDb(tenantId).writerPayout.findMany({
    orderBy: { paidAt: "desc" },
    take,
    select: { id: true, amount: true, reference: true, paidAt: true, writer: { select: { displayName: true } } },
  });
}

export async function payoutReferenceUsed(tenantId: string, reference: string) {
  return (await tenantDb(tenantId).writerPayout.count({ where: { reference } })) > 0;
}

export function createPayout(tenantId: string, data: { writerId: string; amount: number; reference: string | null }) {
  return tenantDb(tenantId).writerPayout.create({ data: { ...data, tenantId } });
}

export function deletePayout(tenantId: string, id: string) {
  return tenantDb(tenantId).writerPayout.deleteMany({ where: { id } });
}

// Orders placed but not paid: still waiting (NEW), or given up on after the unpaid time limit (ABANDONED)
export function sumUnpaidOrders(tenantId: string, status: "NEW" | "ABANDONED", start: Date | null) {
  return tenantDb(tenantId).order.aggregate({
    where: { status, createdAt: since(start) },
    _count: true,
    _sum: { amount: true },
  });
}
