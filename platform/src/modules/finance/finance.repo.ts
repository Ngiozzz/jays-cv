import "server-only";
import { tenantDb } from "@/lib/tenant-db";

const since = (start: Date | null) => (start ? { gte: start } : undefined);

// Confirmed payments for an order or a "Check it yourself" CV check, newest first
export function findOrderPayments(tenantId: string, start: Date | null) {
  return tenantDb(tenantId).payment.findMany({
    where: {
      status: "CONFIRMED",
      OR: [{ orderId: { not: null } }, { cvCheckId: { not: null } }],
      confirmedAt: since(start),
    },
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
      cvCheck: { select: { jobLabel: true } },
    },
  });
}

// Money that reached the Paybill but isn't tied to an order (a name typed as the account, or not from the website)
export function sumUnlinkedPayments(tenantId: string, start: Date | null) {
  return tenantDb(tenantId).payment.aggregate({
    where: { status: "CONFIRMED", orderId: null, cvCheckId: null, confirmedAt: since(start) },
    _count: true,
    _sum: { amount: true },
  });
}

// Orders placed but not paid: still waiting (NEW), or given up on after the unpaid time limit (ABANDONED)
export function sumUnpaidOrders(tenantId: string, status: "NEW" | "ABANDONED", start: Date | null) {
  return tenantDb(tenantId).order.aggregate({
    where: { status, createdAt: since(start) },
    _count: true,
    _sum: { amount: true },
  });
}
