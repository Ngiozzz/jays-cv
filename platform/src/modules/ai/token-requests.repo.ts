import "server-only";
import { tenantDb } from "@/lib/tenant-db";

export function findOpenRequest(tenantId: string) {
  return tenantDb(tenantId).tokenRequest.findFirst({
    where: { status: "PENDING" },
    orderBy: { createdAt: "desc" },
    select: { id: true, tokens: true, note: true, createdAt: true },
  });
}

export function createRequest(tenantId: string, data: { tokens: number; note: string | null; requestedById: string }) {
  return tenantDb(tenantId).tokenRequest.create({ data: { tenantId, ...data } });
}

// Returns how many were closed: 0 when it was already closed (or isn't this business's)
export async function closeRequest(tenantId: string, id: string, status: "DONE" | "CANCELLED", now: Date) {
  const result = await tenantDb(tenantId).tokenRequest.updateMany({
    where: { id, status: "PENDING" },
    data: { status, closedAt: now },
  });
  return result.count;
}
