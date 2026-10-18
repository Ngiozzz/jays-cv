// What crosses the pipe to the Command Center: numbers only, never names, orders or client data.
import { z } from "zod";

// Usage newer than this is held back for one more pull: a slow save can take a running number
// before an earlier one is visible, and the Command Center must never skip past it.
export const SETTLE_MS = 30_000;
export const USAGE_PAGE = { default: 500, max: 1000 } as const;

export const usageQuery = z.object({
  after: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(USAGE_PAGE.max).default(USAGE_PAGE.default),
});

export const command = z.discriminatedUnion("type", [
  z.object({
    id: z.string().min(8).max(64),
    type: z.literal("add_tokens"),
    tokens: z.number().int().min(1).max(1_000_000_000),
    note: z.string().max(200).optional(),
  }),
  z.object({ id: z.string().min(8).max(64), type: z.literal("set_ai_paused"), paused: z.boolean() }),
]);
export type Command = z.infer<typeof command>;

export type Caller = "team" | "visitor" | "automatic";

// Who used the AI, without saying which person: the CV check is the one feature run by website visitors
export function callerKind(entry: { memberId: string | null; feature: string | null }): Caller {
  if (entry.memberId) return "team";
  return entry.feature === "CV check" ? "visitor" : "automatic";
}

type LedgerRow = {
  seq: number;
  createdAt: Date;
  kind: string;
  feature: string | null;
  model: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  delta: number;
  memberId: string | null;
};

export function usageEntry(row: LedgerRow) {
  return {
    seq: row.seq,
    at: row.createdAt.toISOString(),
    kind: row.kind,
    feature: row.feature,
    model: row.model,
    inputTokens: row.inputTokens,
    outputTokens: row.outputTokens,
    delta: row.delta,
    caller: row.kind === "USAGE" ? callerKind(row) : null,
  };
}
