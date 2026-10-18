import "server-only";
import { db } from "@/lib/db";
import { tenantDb } from "@/lib/tenant-db";

// The tenant table isn't business data, so the key lookup uses the shared client
export function findTenantWithKey(slug: string) {
  return db.tenant.findUnique({
    where: { slug },
    select: { id: true, slug: true, name: true, commandCenterKey: true },
  });
}

export function listLedgerAfter(tenantId: string, after: number, before: Date, limit: number) {
  return tenantDb(tenantId).tokenLedgerEntry.findMany({
    where: { seq: { gt: after }, createdAt: { lt: before } },
    orderBy: { seq: "asc" },
    take: limit,
    select: {
      seq: true,
      createdAt: true,
      kind: true,
      feature: true,
      model: true,
      inputTokens: true,
      outputTokens: true,
      delta: true,
      memberId: true,
    },
  });
}

export async function findLastSeq(tenantId: string): Promise<number> {
  const result = await tenantDb(tenantId).tokenLedgerEntry.aggregate({ _max: { seq: true } });
  return result._max.seq ?? 0;
}
