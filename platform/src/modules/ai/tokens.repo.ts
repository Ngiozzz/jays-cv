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
    // null: used by a website visitor, e.g. a "Check it yourself" CV check
    memberId: string | null;
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

// What the AI was used for since a date: runs and tokens per feature, biggest first
export async function sumUsageByFeature(tenantId: string, since: Date) {
  const groups = await tenantDb(tenantId).tokenLedgerEntry.groupBy({
    by: ["feature"],
    where: { kind: "USAGE", createdAt: { gte: since } },
    _count: true,
    _sum: { delta: true },
  });
  return groups
    .map((group) => ({ feature: group.feature ?? "Other", runs: group._count, tokens: -(group._sum.delta ?? 0) }))
    .sort((a, b) => b.tokens - a.tokens);
}
