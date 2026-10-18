import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { tenantDb } from "@/lib/tenant-db";
import { getTokenBalance } from "@/modules/ai/tokens.service";
import * as repo from "./command-center.repo";
import { SETTLE_MS, usageEntry, type Command } from "./messages";
import { verify } from "./protocol";

type Business = { id: string; slug: string; name: string };

// Checks a request's signature and returns the business it came for, or null to refuse it
export async function receive(request: Request, body: string): Promise<Business | null> {
  const url = new URL(request.url);
  let business: Business | null = null;
  const result = await verify(
    {
      method: request.method,
      pathWithQuery: url.pathname + url.search,
      body,
      header: (name) => request.headers.get(name),
    },
    async (slug) => {
      const tenant = await repo.findTenantWithKey(slug);
      if (!tenant?.commandCenterKey) return null;
      business = { id: tenant.id, slug: tenant.slug, name: tenant.name };
      return tenant.commandCenterKey;
    },
  );
  return result.ok ? business : null;
}

export async function getUsage(business: Business, after: number, limit: number) {
  const rows = await repo.listLedgerAfter(business.id, after, new Date(Date.now() - SETTLE_MS), limit);
  return {
    entries: rows.map(usageEntry),
    nextAfter: rows.at(-1)?.seq ?? after,
    more: rows.length === limit,
  };
}

export async function getSummary(business: Business) {
  const [balance, lastSeq] = await Promise.all([getTokenBalance(business.id), repo.findLastSeq(business.id)]);
  return {
    business: business.slug,
    name: business.name,
    remaining: balance.remaining,
    granted: balance.granted,
    aiPaused: balance.paused,
    lastSeq,
  };
}

type CommandResult = { status: "done" | "repeated"; result: Prisma.JsonValue } | { status: "conflict" };

// Carries out a command once. Sent again with the same id, it returns the first result and changes nothing.
export async function runCommand(business: Business, cmd: Command): Promise<CommandResult> {
  const db = tenantDb(business.id);
  const seen = await db.ccCommand.findFirst({ where: { id: cmd.id } });
  if (seen) return { status: "repeated", result: seen.result };

  try {
    return await db.$transaction(async (tx) => {
      let result: Record<string, number | boolean>;
      if (cmd.type === "add_tokens") {
        const entry = await tx.tokenLedgerEntry.create({
          data: {
            tenantId: business.id,
            kind: "TOP_UP",
            delta: cmd.tokens,
            note: cmd.note ?? "Added from the Command Center",
          },
        });
        result = { tokensAdded: cmd.tokens, seq: entry.seq };
      } else {
        await tx.businessSettings.updateMany({ data: { aiPaused: cmd.paused } });
        result = { aiPaused: cmd.paused };
      }
      const { id, ...payload } = cmd;
      await tx.ccCommand.create({ data: { id, tenantId: business.id, type: cmd.type, payload, result } });
      return { status: "done" as const, result };
    });
  } catch (error) {
    // The same command arrived twice at once and the other one won; or the id belongs to another business
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const winner = await db.ccCommand.findFirst({ where: { id: cmd.id } });
      return winner ? { status: "repeated", result: winner.result } : { status: "conflict" };
    }
    throw error;
  }
}
