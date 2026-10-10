import "server-only";
import { tenantDb } from "@/lib/tenant-db";

export async function sumTokenDeltas(tenantId: string): Promise<number> {
  const result = await tenantDb(tenantId).tokenLedgerEntry.aggregate({ _sum: { delta: true } });
  return result._sum.delta ?? 0;
}

export async function sumGrantedTokens(tenantId: string): Promise<number> {
  const result = await tenantDb(tenantId).tokenLedgerEntry.aggregate({
    where: { delta: { gt: 0 } },
    _sum: { delta: true },
  });
  return result._sum.delta ?? 0;
}
