import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { tenantDb } from "@/lib/tenant-db";

// Orders as the team sees them. Privacy (money, contact details) is applied by the service.

// Orders for the list. Unfinished orders are always few, so they're loaded whole; delivered ones pile up
// over the years, so callers pass a filter, order and page for those (see orders-history.ts).
export function findOrdersForList(
  tenantId: string,
  where: Prisma.OrderWhereInput,
  page: { orderBy?: Prisma.OrderOrderByWithRelationInput; take?: number } = {},
) {
  return tenantDb(tenantId).order.findMany({
    where,
    orderBy: page.orderBy ?? { createdAt: "desc" },
    take: page.take,
    select: {
      id: true,
      number: true,
      status: true,
      itemName: true,
      amount: true,
      clientName: true,
      clientPhone: true,
      createdAt: true,
      paidAt: true,
      draftSentAt: true,
      remindedAt: true,
      deliveredAt: true,
      writerId: true,
      firstDraftHours: true,
      extraHours: true,
      revisionRounds: true,
      revisionWindowDays: true,
      package: { select: { shortName: true } },
      writer: { select: { displayName: true } },
      revisions: { orderBy: { round: "asc" }, select: { requestedAt: true } },
      payments: {
        where: { status: "CONFIRMED" },
        orderBy: { confirmedAt: "desc" },
        take: 1,
        select: { channel: true, receipt: true },
      },
    },
  });
}

export type OrderListRecord = Awaited<ReturnType<typeof findOrdersForList>>[number];

export function countOrders(tenantId: string, where: Prisma.OrderWhereInput) {
  return tenantDb(tenantId).order.count({ where });
}

// Money taken this month on delivered orders (the unfinished ones are counted from the list itself)
export async function sumDeliveredPaidSince(tenantId: string, since: Date) {
  const result = await tenantDb(tenantId).order.aggregate({
    where: { status: "DELIVERED", paidAt: { gte: since } },
    _sum: { amount: true },
  });
  return result._sum.amount ?? 0;
}

// Everyone who can take orders: the owner and active members allowed to write
export function findWriters(tenantId: string) {
  return tenantDb(tenantId).membership.findMany({
    where: { status: "ACTIVE", OR: [{ role: "OWNER" }, { canWrite: true }] },
    orderBy: { displayName: "asc" },
    select: { id: true, displayName: true },
  });
}

export function findPackageNames(tenantId: string) {
  return tenantDb(tenantId).package.findMany({ orderBy: { sortOrder: "asc" }, select: { shortName: true } });
}

// One order with everything the order page shows (privacy is applied by the service)
export function findOrderDetail(tenantId: string, number: number) {
  return tenantDb(tenantId).order.findFirst({
    where: { number },
    select: {
      id: true,
      number: true,
      status: true,
      itemName: true,
      amount: true,
      clientName: true,
      clientPhone: true,
      clientEmail: true,
      targetRole: true,
      industry: true,
      experience: true,
      notes: true,
      jobAdvert: true,
      job: { select: { slug: true, title: true, company: true } },
      noCv: true,
      source: true,
      trackingTokenSealed: true,
      createdAt: true,
      paidAt: true,
      acceptedAt: true,
      draftSentAt: true,
      remindedAt: true,
      deliveredAt: true,
      writerId: true,
      firstDraftHours: true,
      extraHours: true,
      revisionRounds: true,
      revisionWindowDays: true,
      writer: { select: { displayName: true } },
      revisions: {
        orderBy: { round: "asc" },
        select: { round: true, text: true, requestedBy: true, requestedAt: true },
      },
      payments: {
        where: { status: "CONFIRMED" },
        orderBy: { confirmedAt: "desc" },
        select: { channel: true, receipt: true, amount: true, accountReference: true, confirmedAt: true },
      },
      files: {
        where: { deletedAt: null },
        orderBy: { createdAt: "asc" },
        select: { id: true, kind: true, version: true, name: true, sizeBytes: true, note: true, createdAt: true },
      },
      events: {
        orderBy: { at: "desc" },
        select: {
          kind: true,
          actorType: true,
          data: true,
          at: true,
          visibleToClient: true,
          actor: { select: { displayName: true } },
        },
      },
    },
  });
}

export type OrderDetailRecord = NonNullable<Awaited<ReturnType<typeof findOrderDetail>>>;
