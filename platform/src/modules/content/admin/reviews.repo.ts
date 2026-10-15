import "server-only";
import { tenantDb } from "@/lib/tenant-db";
import type { Tx } from "./history";
import type { NewReview, ReviewStatus } from "./reviews";

// Every review, newest first, whatever its status (the website only reads published, featured ones)
export function findAllReviews(tenantId: string) {
  return tenantDb(tenantId).review.findMany({
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      role: true,
      rating: true,
      text: true,
      status: true,
      featured: true,
      consent: true,
      source: true,
      aiFlag: true,
      aiReason: true,
    },
  });
}

// 1–2 star reviews from clients that the owner hasn't dealt with yet (approved or hidden)
export function findLowPendingReviews(tenantId: string) {
  return tenantDb(tenantId).review.findMany({
    where: { status: "PENDING", rating: { lte: 2 }, orderId: { not: null } },
    orderBy: { createdAt: "desc" },
    select: { id: true, rating: true, text: true, name: true, order: { select: { number: true } } },
  });
}

export function findReview(tenantId: string, id: string) {
  return tenantDb(tenantId).review.findFirst({ where: { id } });
}

export function countOnHomepage(tenantId: string) {
  return tenantDb(tenantId).review.count({ where: { status: "APPROVED", featured: true, consent: true } });
}

export function updateReview(
  tx: Tx,
  id: string,
  data: Partial<{ status: ReviewStatus; featured: boolean; text: string }>,
) {
  return tx.review.update({ where: { id }, data });
}

export function createReview(tx: Tx, tenantId: string, review: NewReview & { status: ReviewStatus }) {
  return tx.review.create({ data: { ...review, role: review.role || null, tenantId } });
}

export function deleteReview(tx: Tx, id: string) {
  return tx.review.delete({ where: { id } });
}
