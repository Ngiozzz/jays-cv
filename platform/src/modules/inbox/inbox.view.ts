import "server-only";
import { fileStore } from "@/lib/storage";
import { SCAM_RISKS, type ScamRisk } from "@/modules/ai/poster-reading";
import { getTokenBalance } from "@/modules/ai/tokens.service";
import { getJobBoard } from "@/modules/jobs/jobs.public";
import { todayInNairobi } from "@/modules/jobs/jobs.rules";
import { jobDraftSchema, type JobInput } from "@/modules/jobs/jobs.schema";
import type { CurrentMember } from "@/modules/team/current-member";
import { assertCan, can } from "@/modules/team/permissions";
import type { AiScamOpinion } from "./inbox.flags";
import * as repo from "./inbox.repo";

// Everything the inbox screen needs, in plain data the browser can use

export type InboxState = "reading" | "check" | "approved" | "discarded";

export type InboxCard = {
  id: string;
  state: InboxState;
  posterUrl: string;
  posterName: string;
  source: string;
  rawText: string;
  aiScam: AiScamOpinion | null;
  job: JobInput | null;
  unsure: string[];
  checked: string[];
  readError: string | null;
  discardReason: string | null;
  jobSlug: string | null;
  decidedToday: boolean;
};

// About what one poster costs to read (measured on the sample batch): used for "≈ posters left"
export const TOKENS_PER_POSTER = 2030;

export async function loadInbox(member: CurrentMember) {
  assertCan(member, "postJobs");
  const tenantId = member.tenant.id;
  const now = new Date();
  const today = todayInNairobi(now);
  const [rows, board, tokens] = await Promise.all([
    repo.findInboxItems(tenantId, now),
    getJobBoard(tenantId),
    // Only the owner sees the token balance
    can(member, "seeMoney") ? getTokenBalance(tenantId) : Promise.resolve(null),
  ]);

  const cards: InboxCard[] = rows.map((row) => {
    const reading = row.reading ? jobDraftSchema.safeParse(row.reading) : null;
    return {
      id: row.id,
      state: row.state.toLowerCase() as InboxState,
      posterUrl: fileStore.publicUrl("job-posters", row.posterPath),
      posterName: row.posterName,
      source: row.source,
      rawText: row.rawText,
      aiScam: (SCAM_RISKS as readonly string[]).includes(row.scamRisk ?? "")
        ? { risk: row.scamRisk as ScamRisk, reason: row.scamReason ?? "" }
        : null,
      // A poster the AI couldn't read has an untitled job; the team types it in
      job: reading?.success ? reading.data : row.reading ? (row.reading as JobInput) : null,
      unsure: row.unsure,
      checked: row.checked,
      readError: row.readError,
      discardReason: row.discardReason,
      jobSlug: row.job?.slug ?? null,
      decidedToday: row.decidedAt ? todayInNairobi(row.decidedAt) === today : false,
    };
  });

  return {
    today,
    cards,
    liveJobs: board.jobs.map(({ title, company, postedDay }) => ({ title, company, postedDay })),
    tokens: tokens && { remaining: tokens.remaining, postersLeft: Math.floor(tokens.remaining / TOKENS_PER_POSTER) },
  };
}

export type InboxData = Awaited<ReturnType<typeof loadInbox>>;
