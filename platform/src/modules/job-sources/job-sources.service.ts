import "server-only";
import { AiUnavailableError, pickJobLinks } from "@/modules/ai/claude";
import { htmlToText } from "@/modules/ai/links";
import { aiStopped } from "@/modules/ai/tokens";
import { getTokenBalance } from "@/modules/ai/tokens.service";
import { recordUsage } from "@/modules/ai/tokens.repo";
import { createInboxItem } from "@/modules/inbox/inbox.repo";
import { canonicalUrl, feedLinks, isFeed, pageLinks, type FoundLink } from "./discover";
import { bodyText, fetchPolitely, isPdf, MAX_PAGE_BYTES, Unreadable, type RobotsCache } from "./fetch";
import * as repo from "./job-sources.repo";
import { bannedSite } from "./sites";

// Checking a job source: open its vacancies page (or feed), find the job adverts that haven't been
// seen before, and queue up to DAILY_LIMIT of them in Bulk post. Each advert is read by the AI
// afterwards (by the morning run, or by the Bulk post screen when someone opens it).

// At most this many new jobs from one source per check (keeps the AI cost and the checking manageable)
export const DAILY_LIMIT = 20;
// Failed checks in a row before a source is switched off and the owner told
export const MAX_FAILURES = 3;

export type CheckOutcome =
  // found: job adverts the page lists that are new; added: queued in Bulk post now; waiting: left for next time
  | { ok: true; links: number; found: number; added: number; waiting: number }
  // counted: whether it counts as a failed check (an empty AI balance isn't the source's fault)
  | { ok: false; error: string; counted: boolean };

export async function checkSource(
  tenantId: string,
  sourceId: string,
  memberId: string | null,
  options: { robots?: RobotsCache; limit?: number } = {},
): Promise<CheckOutcome> {
  const source = await repo.findSource(tenantId, sourceId);
  if (!source) return { ok: false, error: "Job source not found.", counted: false };
  const stopped = aiStopped(await getTokenBalance(tenantId));
  if (stopped) {
    return {
      ok: false,
      error: stopped === "paused" ? "The AI is paused." : "The AI tokens have run out.",
      counted: false,
    };
  }

  const robots = options.robots ?? new Map();
  try {
    const banned = await repo.extraBannedSites(tenantId);
    const found = await findAdverts(tenantId, source, memberId, banned, robots);
    const unseen = found.unseen;
    const jobs = found.jobs.slice(0, options.limit ?? DAILY_LIMIT);
    const chosen = new Set(found.jobs.map((job) => job.url));
    // Remembered in one spelling, for every source. Jobs beyond today's limit stay unseen, so they
    // are offered again next time.
    await repo.markSeen(tenantId, source.id, [
      ...unseen.filter((link) => !chosen.has(link.url)).map((link) => ({ url: canonicalUrl(link.url), isJob: false })),
      ...jobs.map((job) => ({ url: canonicalUrl(job.url), isJob: true })),
    ]);
    for (const job of jobs) {
      await createInboxItem(tenantId, {
        posterPath: null,
        posterName: job.text || "Job advert",
        posterType: "text/html",
        source: source.name,
        pageUrl: job.url,
        jobSourceId: source.id,
        unsure: [],
        checked: [],
        addedById: memberId,
      });
    }
    await repo.updateSource(tenantId, source.id, {
      lastCheckedAt: new Date(),
      lastAdded: jobs.length,
      lastError: null,
      failures: 0,
    });
    return {
      ok: true,
      links: found.links,
      found: found.jobs.length,
      added: jobs.length,
      waiting: found.jobs.length - jobs.length,
    };
  } catch (error) {
    // The AI being busy isn't the source's fault: try again later without counting it
    if (error instanceof AiUnavailableError) return { ok: false, error: error.message, counted: false };
    const reason = error instanceof Unreadable ? error.message : "the site couldn't be reached";
    if (!(error instanceof Unreadable)) console.warn(`[job-sources] ${source.url}:`, error);
    const failures = source.failures + 1;
    await repo.updateSource(tenantId, source.id, {
      lastCheckedAt: new Date(),
      lastAdded: 0,
      lastError: reason,
      failures,
      // Switched off after too many failures in a row; the owner sees why and can switch it back on
      ...(failures >= MAX_FAILURES ? { enabled: false } : {}),
    });
    return { ok: false, error: capitalise(reason), counted: true };
  }
}

type SourceRow = NonNullable<Awaited<ReturnType<typeof repo.findSource>>>;

// The new job adverts on a source's page: a feed's entries are all adverts; a web page's links are
// picked by the AI (only links not seen before are sent, so a quiet day costs nothing)
async function findAdverts(
  tenantId: string,
  source: SourceRow,
  memberId: string | null,
  banned: string[],
  robots: RobotsCache,
): Promise<{ links: number; unseen: FoundLink[]; jobs: FoundLink[] }> {
  const fetched = await fetchPolitely(source.url, {
    banned,
    robots,
    accept: "text/html,application/rss+xml,application/atom+xml,application/xml;q=0.9,text/xml;q=0.9,*/*;q=0.5",
    maxBytes: MAX_PAGE_BYTES,
  });
  if (isPdf(fetched)) throw new Unreadable("this address is a single PDF: add the page that lists the vacancies");
  const body = bodyText(fetched);
  const feed = isFeed(fetched.contentType, body);
  const all = oncePerPage(
    (feed ? feedLinks(body, fetched.finalUrl) : pageLinks(body, fetched.finalUrl)).filter(
      (link) => !bannedSite(link.url, banned),
    ),
  );
  if (!feed && all.length < 3 && htmlToText(body).length < 300) {
    throw new Unreadable("the page only works in a web browser");
  }
  // Seen by ANY source counts: the same advert linked from two sites is only added (and paid for) once.
  // Older records may hold the link as written, so both spellings are looked up.
  const seen = await repo.seenUrls(
    tenantId,
    all.flatMap((link) => [link.url, canonicalUrl(link.url)]),
  );
  const unseen = all.filter((link) => !seen.has(link.url) && !seen.has(canonicalUrl(link.url)));
  if (!unseen.length) return { links: all.length, unseen, jobs: [] };
  if (feed) return { links: all.length, unseen, jobs: unseen };

  const { data, usage } = await pickJobLinks(source.name, fetched.finalUrl, unseen);
  if (usage) await recordUsage(tenantId, { feature: "Job sources", memberId, ...usage });
  return { links: all.length, unseen, jobs: data };
}

// The same page linked twice in different spellings (with and without "www.", a tracking bit) is one link
function oncePerPage(links: FoundLink[]): FoundLink[] {
  const byKey = new Map<string, FoundLink>();
  for (const link of links) {
    const key = canonicalUrl(link.url);
    if (!byKey.has(key)) byKey.set(key, link);
  }
  return [...byKey.values()];
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1) + (/[.!?]$/.test(text) ? "" : ".");
}
