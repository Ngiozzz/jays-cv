import "server-only";
import { tenantDb } from "@/lib/tenant-db";

export async function sumTokenDeltas(tenantId: string): Promise<number> {
  const result = await tenantDb(tenantId).tokenLedgerEntry.aggregate({ _sum: { delta: true } });
  return result._sum.delta ?? 0;
}

// Everything left from before a date (what carries over into the month that starts then)
export async function sumDeltasBefore(tenantId: string, before: Date): Promise<number> {
  const result = await tenantDb(tenantId).tokenLedgerEntry.aggregate({
    where: { createdAt: { lt: before } },
    _sum: { delta: true },
  });
  return result._sum.delta ?? 0;
}

// Tokens given since a date other than one entry (the monthly grant), less any taken back
export async function sumAddedSince(tenantId: string, since: Date, exceptId: string): Promise<number> {
  const result = await tenantDb(tenantId).tokenLedgerEntry.aggregate({
    where: {
      createdAt: { gte: since },
      id: { not: exceptId },
      OR: [{ kind: { in: ["TOP_UP", "GRANT"] } }, { kind: "ADJUSTMENT" }],
    },
    _sum: { delta: true },
  });
  return result._sum.delta ?? 0;
}

// The month's tokens, given once: the fixed id makes a second attempt fail instead of doubling them
export async function grantMonthlyTokens(
  tenantId: string,
  grant: { id: string; note: string; tokens: number; at: Date },
): Promise<number> {
  const scoped = tenantDb(tenantId);
  const existing = await scoped.tokenLedgerEntry.findUnique({ where: { id: grant.id }, select: { delta: true } });
  if (existing) return existing.delta;
  try {
    await scoped.tokenLedgerEntry.create({
      data: { id: grant.id, tenantId, kind: "GRANT", delta: grant.tokens, note: grant.note, createdAt: grant.at },
    });
  } catch (error) {
    // Another request gave them a moment ago
    if ((error as { code?: string }).code !== "P2002") throw error;
  }
  return grant.tokens;
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
    orderId?: string;
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
      orderId: usage.orderId,
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

// One person's AI use since a date, in tokens
export async function sumMemberUsageSince(tenantId: string, memberId: string, since: Date): Promise<number> {
  const result = await tenantDb(tenantId).tokenLedgerEntry.aggregate({
    where: { kind: "USAGE", memberId, createdAt: { gte: since } },
    _sum: { delta: true },
  });
  return -(result._sum.delta ?? 0);
}

// Every AI run since a date, for the daily chart and each person's share (a month is a few hundred rows)
export function findUsageSince(tenantId: string, since: Date) {
  return tenantDb(tenantId).tokenLedgerEntry.findMany({
    where: { kind: "USAGE", createdAt: { gte: since } },
    select: { delta: true, createdAt: true, memberId: true },
  });
}

export function findLatestRuns(tenantId: string, take: number) {
  return tenantDb(tenantId).tokenLedgerEntry.findMany({
    where: { kind: "USAGE" },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      delta: true,
      feature: true,
      createdAt: true,
      member: { select: { displayName: true } },
      order: { select: { number: true } },
    },
  });
}

// Tokens given to the business (monthly grants, top-ups asked for, corrections), newest first
export function findTokensAdded(tenantId: string, take: number) {
  return tenantDb(tenantId).tokenLedgerEntry.findMany({
    where: { kind: { not: "USAGE" } },
    orderBy: { createdAt: "desc" },
    take,
    select: { id: true, kind: true, delta: true, note: true, createdAt: true },
  });
}

// The team as the AI page lists them
export function findTeamAi(tenantId: string) {
  return tenantDb(tenantId).membership.findMany({
    where: { status: { not: "REMOVED" } },
    orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
    select: { id: true, displayName: true, role: true, status: true, aiEnabled: true, aiAllowance: true },
  });
}

export function findMemberAi(tenantId: string, id: string) {
  return tenantDb(tenantId).membership.findUnique({
    where: { id },
    select: { id: true, role: true, status: true, aiEnabled: true, aiAllowance: true },
  });
}

export function updateMemberAi(
  tenantId: string,
  id: string,
  data: { aiEnabled?: boolean; aiAllowance?: number | null },
) {
  return tenantDb(tenantId).membership.update({ where: { id }, data });
}

export function updatePoolFallback(tenantId: string, on: boolean) {
  return tenantDb(tenantId).businessSettings.updateMany({ data: { aiPoolFallback: on } });
}
