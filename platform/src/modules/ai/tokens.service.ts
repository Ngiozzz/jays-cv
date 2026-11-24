import "server-only";
import { findSettings } from "@/modules/content/content.repo";
import { periodStart } from "@/modules/finance/finance.rules";
import type { CurrentMember } from "@/modules/team/current-member";
import { assertCan } from "@/modules/team/permissions";
import { findOpenRequest } from "./token-requests.repo";
import {
  MEMBER_AI_MESSAGE,
  MONTHLY_TOKENS,
  monthlyGrant,
  memberAiStop,
  parseAllowance,
  tokenBalance,
  tokenPace,
  usageByDay,
  type TokenBalance,
} from "./tokens";
import * as repo from "./tokens.repo";

// The business's tokens. The first look in a new month gives it that month's tokens.
export async function getTokenBalance(tenantId: string, now: Date = new Date()): Promise<TokenBalance> {
  const monthStart = periodStart("month", now)!;
  const grant = monthlyGrant(tenantId, monthStart);
  const monthly = await repo.grantMonthlyTokens(tenantId, { ...grant, tokens: MONTHLY_TOKENS, at: monthStart });
  const [remaining, carriedOver, added, settings] = await Promise.all([
    repo.sumTokenDeltas(tenantId),
    repo.sumDeltasBefore(tenantId, monthStart),
    repo.sumAddedSince(tenantId, monthStart, grant.id),
    findSettings(tenantId),
  ]);
  return tokenBalance(remaining, { carriedOver, monthly, added }, settings.aiWarnPct, settings.aiPaused);
}

// Whether this person may run the AI right now (the business's balance is checked separately):
// null when they may, otherwise what to tell them
export async function memberAiBlock(member: CurrentMember, now: Date = new Date()): Promise<string | null> {
  if (member.role === "OWNER") return null;
  const tenantId = member.tenant.id;
  const [membership, settings, used] = await Promise.all([
    repo.findMemberAi(tenantId, member.id),
    findSettings(tenantId),
    repo.sumMemberUsageSince(tenantId, member.id, periodStart("month", now)!),
  ]);
  if (!membership) return MEMBER_AI_MESSAGE.off;
  const stop = memberAiStop(membership, used, settings.aiPoolFallback);
  return stop ? MEMBER_AI_MESSAGE[stop] : null;
}

const DAY_MS = 86_400_000;

// Admin → AI: the balance and its pace, what it was used for, each person's share, and what was added
export async function loadAiPage(member: CurrentMember, now: Date = new Date()) {
  assertCan(member, "requestTokens");
  const tenantId = member.tenant.id;
  const monthStart = periodStart("month", now)!;
  const [balance, settings, byFeature, usage, runs, added, request, team] = await Promise.all([
    getTokenBalance(tenantId, now),
    findSettings(tenantId),
    repo.sumUsageByFeature(tenantId, monthStart),
    repo.findUsageSince(tenantId, monthStart),
    repo.findLatestRuns(tenantId, 8),
    repo.findTokensAdded(tenantId, 6),
    findOpenRequest(tenantId),
    repo.findTeamAi(tenantId),
  ]);
  const usedThisMonth = byFeature.reduce((sum, f) => sum + f.tokens, 0);
  const daysSoFar = Math.max(1, Math.ceil((now.getTime() - monthStart.getTime()) / DAY_MS));
  const pace = tokenPace(balance.remaining, usedThisMonth, daysSoFar);
  const usedBy = new Map<string, number>();
  for (const entry of usage) {
    const key = entry.memberId ?? "website";
    usedBy.set(key, (usedBy.get(key) ?? 0) - entry.delta);
  }
  const posterReading = byFeature.find((f) => f.feature === "Poster reading");
  return {
    balance,
    warnPct: settings.aiWarnPct,
    poolFallback: settings.aiPoolFallback,
    usedThisMonth,
    pace,
    runsOutOn: pace.daysLeft !== null ? new Date(now.getTime() + pace.daysLeft * DAY_MS).toISOString() : null,
    postersLeft:
      posterReading && posterReading.runs > 0
        ? Math.floor(balance.remaining / (posterReading.tokens / posterReading.runs))
        : null,
    days: usageByDay(usage, monthStart, now),
    byFeature,
    // Runs by website visitors (a client's "Check it yourself") and automatic ones belong to nobody
    unassigned: usedBy.get("website") ?? 0,
    team: team.map((m) => ({
      id: m.id,
      name: m.displayName,
      owner: m.role === "OWNER",
      paused: m.status === "PAUSED",
      aiEnabled: m.aiEnabled,
      allowance: m.aiAllowance,
      used: usedBy.get(m.id) ?? 0,
    })),
    runs: runs.map((run) => ({
      id: run.id,
      at: run.createdAt.toISOString(),
      who: run.member?.displayName ?? "Automatic or website",
      what: run.feature ?? "AI",
      order: run.order ? `${member.tenant.orderPrefix}-${run.order.number}` : null,
      tokens: -run.delta,
    })),
    added: added.map((entry) => ({
      id: entry.id,
      kind: entry.kind,
      at: entry.createdAt.toISOString(),
      note: entry.note,
      tokens: entry.delta,
    })),
    request,
  };
}

export type AiPageData = Awaited<ReturnType<typeof loadAiPage>>;

type Result = { ok: true } | { ok: false; error: string };

async function teammate(member: CurrentMember, membershipId: string) {
  assertCan(member, "requestTokens");
  const target = await repo.findMemberAi(member.tenant.id, membershipId);
  return target && target.status !== "REMOVED" ? target : null;
}

// One person's monthly share: a number of tokens, or empty for no limit of their own
export async function setAiAllowance(member: CurrentMember, membershipId: string, raw: unknown): Promise<Result> {
  const target = await teammate(member, membershipId);
  if (!target) return { ok: false, error: "This person isn't on the team." };
  if (target.role === "OWNER") return { ok: false, error: "The owner has no limit." };
  const parsed = parseAllowance(raw);
  if (!parsed.ok) return parsed;
  await repo.updateMemberAi(member.tenant.id, target.id, { aiAllowance: parsed.allowance });
  return { ok: true };
}

export async function setAiEnabled(member: CurrentMember, membershipId: string, enabled: boolean): Promise<Result> {
  const target = await teammate(member, membershipId);
  if (!target) return { ok: false, error: "This person isn't on the team." };
  if (target.role === "OWNER") return { ok: false, error: "The AI can't be switched off for the owner." };
  await repo.updateMemberAi(member.tenant.id, target.id, { aiEnabled: enabled });
  return { ok: true };
}

export async function setPoolFallback(member: CurrentMember, on: boolean): Promise<Result> {
  assertCan(member, "requestTokens");
  await repo.updatePoolFallback(member.tenant.id, on);
  return { ok: true };
}
