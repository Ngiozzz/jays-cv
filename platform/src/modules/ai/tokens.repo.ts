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

export function recordUsage(
  tenantId: string,
  usage: {
    feature: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    memberId: string;
    jobId?: string;
  },
) {
  return tenantDb(tenantId).tokenLedgerEntry.create({
    data: {
      tenantId,
      kind: "USAGE",
      delta: -(usage.inputTokens + usage.outputTokens),
      feature: usage.feature,
      model: usage.model,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      memberId: usage.memberId,
      jobId: usage.jobId,
    },
  });
}
