import "server-only";
import { tenantDb } from "@/lib/tenant-db";
import type { CurrentMember } from "@/modules/team/current-member";
import { assertCan } from "@/modules/team/permissions";
import { pageLinks } from "./discover";
import { bodyText, fetchPolitely, isPdf, MAX_PAGE_BYTES, Unreadable, type RobotsCache } from "./fetch";
import { checkSource, MAX_FAILURES, type CheckOutcome } from "./job-sources.service";
import * as repo from "./job-sources.repo";
import { bannedSite, BUILT_IN_BANNED_SITES, cleanBannedSites, siteName } from "./sites";
import { STARTER_SOURCES, type StarterSource } from "./starter-sources";
import {
  careersLink,
  isVacanciesSite,
  sameEmployerSite,
  sourceNameFor,
  suggestSources,
  type PostedJob,
  type SourceSuggestion,
} from "./suggest";

// The owner's Job sources screen: which websites the morning run reads, the ready-made list,
// suggestions from the jobs already posted, and the sites that may never be read.

export type JobSourceRow = {
  id: string;
  name: string;
  url: string;
  site: string;
  enabled: boolean;
  lastCheckedAt: string | null;
  lastAdded: number;
  lastError: string | null;
  failures: number;
  // Switched off by the website after failing MAX_FAILURES times in a row (not by a person)
  stoppedByFailures: boolean;
};

export type JobSourcesView = {
  sources: JobSourceRow[];
  // The ready-made list, each marked when it's already a source
  starters: (StarterSource & { added: boolean })[];
  suggestions: SourceSuggestion[];
  builtInBanned: readonly string[];
  extraBanned: string[];
  // The morning run is switched on
  morning: boolean;
};

export const MAX_SOURCES = 50;
// Suggestions look at the jobs posted in the last year
const SUGGEST_FROM_DAYS = 365;

export async function loadJobSources(member: CurrentMember): Promise<JobSourcesView> {
  assertCan(member, "manageJobSources");
  const tenantId = member.tenant.id;
  const [rows, extraBanned, suggestions, morning] = await Promise.all([
    repo.listSources(tenantId),
    repo.extraBannedSites(tenantId),
    loadSuggestions(tenantId),
    repo.morningRunOn(tenantId),
  ]);
  return {
    sources: rows.map((row) => ({
      id: row.id,
      name: row.name,
      url: row.url,
      site: siteName(row.url) ?? row.url,
      enabled: row.enabled,
      lastCheckedAt: row.lastCheckedAt?.toISOString() ?? null,
      lastAdded: row.lastAdded,
      lastError: row.lastError,
      failures: row.failures,
      stoppedByFailures: !row.enabled && row.failures >= MAX_FAILURES,
    })),
    starters: STARTER_SOURCES.map((starter) => ({
      ...starter,
      added: rows.some((row) => row.url === starter.url),
    })),
    suggestions,
    builtInBanned: BUILT_IN_BANNED_SITES,
    extraBanned,
    morning,
  };
}

// Employers from the jobs already posted whose website isn't a source yet (nor hidden, nor banned)
async function loadSuggestions(tenantId: string): Promise<SourceSuggestion[]> {
  const db = tenantDb(tenantId);
  const since = new Date(Date.now() - SUGGEST_FROM_DAYS * 86_400_000);
  const [jobs, sources, settings] = await Promise.all([
    db.job.findMany({ where: { postedAt: { gte: since } }, select: { company: true, apply: true } }),
    repo.listSources(tenantId),
    db.businessSettings.findFirst({ select: { bannedJobSites: true, ignoredSourceSites: true } }),
  ]);
  const ignored = new Set(settings?.ignoredSourceSites ?? []);
  const banned = settings?.bannedJobSites ?? [];
  return suggestSources(
    jobs.map((job) => ({ company: job.company, apply: (job.apply ?? {}) as PostedJob["apply"] })),
    (site) =>
      ignored.has(site) ||
      Boolean(bannedSite(`https://${site}`, banned)) ||
      sources.some((source) => sameEmployerSite(source.url, `https://${site}`)),
  );
}

type FieldErrors = Partial<Record<"name" | "url" | "form", string>>;
export type AddResult = { ok: true; outcome: CheckOutcome & { ok: true } } | { ok: false; errors: FieldErrors };

// Adds a source typed in by hand and reads it straight away, so the owner sees whether it works.
// A source that can't be read (banned, closed to robots, broken) isn't kept.
export async function addJobSource(member: CurrentMember, input: { name: string; url: string }): Promise<AddResult> {
  assertCan(member, "manageJobSources");
  const tenantId = member.tenant.id;
  const name = input.name.trim().replace(/\s+/g, " ").slice(0, 80);
  const url = normaliseUrl(input.url);
  const errors: FieldErrors = {};
  if (!name) errors.name = "Give it a name, e.g. KRA careers.";
  if (!url) errors.url = "Paste the full address of the vacancies page, starting with https://";
  if (Object.keys(errors).length) return { ok: false, errors };

  const refused = await refusal(tenantId, url!);
  if (refused) return { ok: false, errors: refused };
  const source = await repo.createSource(tenantId, { name, url: url!, addedById: member.id });
  const outcome = await checkSource(tenantId, source.id, member.id);
  if (!outcome.ok) {
    await tenantDb(tenantId).jobSource.delete({ where: { id: source.id } });
    return { ok: false, errors: { url: `Couldn't use this page: ${lowerFirst(outcome.error)}` } };
  }
  return { ok: true, outcome };
}

// Why this page can't be added (banned, already there, too many sources), or null
async function refusal(tenantId: string, url: string): Promise<FieldErrors | null> {
  const banned = bannedSite(url, await repo.extraBannedSites(tenantId));
  if (banned) return { url: `${banned} is on the banned list: its jobs can't be copied.` };
  const existing = await repo.listSources(tenantId);
  if (existing.length >= MAX_SOURCES) return { form: `You can have up to ${MAX_SOURCES} sources.` };
  if (existing.some((source) => source.url === url)) return { url: "This page is already a source." };
  return null;
}

export type QuickAddResult = { added: string[]; failed: { name: string; error: string }[] };

// Ticked sources from the ready-made list. They were checked when the list was made, so they are
// saved straight away and read at the next morning run (or with Check now).
export async function addStarterSources(member: CurrentMember, ids: string[]): Promise<QuickAddResult> {
  assertCan(member, "manageJobSources");
  const tenantId = member.tenant.id;
  const result: QuickAddResult = { added: [], failed: [] };
  for (const starter of STARTER_SOURCES.filter((s) => ids.includes(s.id))) {
    const refused = await refusal(tenantId, starter.url);
    if (refused) {
      // Already a source: nothing to do
      if (!refused.url?.startsWith("This page is already")) {
        result.failed.push({ name: starter.name, error: refused.url ?? refused.form ?? "" });
      }
      continue;
    }
    await repo.createSource(tenantId, { name: starter.name, url: starter.url, addedById: member.id });
    result.added.push(starter.name);
  }
  return result;
}

// Suggested employers: their careers page is looked for on their website (no AI), then saved.
export async function addSuggestedSources(member: CurrentMember, sites: string[]): Promise<QuickAddResult> {
  assertCan(member, "manageJobSources");
  const tenantId = member.tenant.id;
  const suggestions = await loadSuggestions(tenantId);
  const banned = await repo.extraBannedSites(tenantId);
  const robots: RobotsCache = new Map();
  const result: QuickAddResult = { added: [], failed: [] };
  for (const suggestion of suggestions.filter((s) => sites.includes(s.site))) {
    const name = sourceNameFor(suggestion.company);
    try {
      const url = await findCareersPage(suggestion.start, banned, robots);
      if (!url) throw new Unreadable(`no careers or vacancies page found on ${suggestion.site}`);
      const refused = await refusal(tenantId, url);
      if (refused) throw new Unreadable(lowerFirst(refused.url ?? refused.form ?? "it can't be added"));
      await repo.createSource(tenantId, { name, url, addedById: member.id });
      result.added.push(name);
    } catch (error) {
      const reason = error instanceof Unreadable ? error.message : "the site couldn't be reached";
      result.failed.push({ name: suggestion.company, error: reason });
    }
  }
  return result;
}

// Hides a suggestion (e.g. a company with no careers page) so it isn't offered again
export async function hideSuggestion(member: CurrentMember, site: string) {
  assertCan(member, "manageJobSources");
  const db = tenantDb(member.tenant.id);
  const settings = await db.businessSettings.findFirst({ select: { ignoredSourceSites: true } });
  const ignored = new Set(settings?.ignoredSourceSites ?? []);
  ignored.add(site.trim().toLowerCase().slice(0, 200));
  await db.businessSettings.updateMany({ data: { ignoredSourceSites: [...ignored].slice(-500) } });
  return { ok: true as const };
}

// A company's vacancies page: the site itself when it is a hiring site, else the careers link on
// its homepage (trying www. too). Null when the homepage has no such link.
async function findCareersPage(start: string, banned: string[], robots: RobotsCache): Promise<string | null> {
  const open = async (url: string) => {
    const fetched = await fetchPolitely(url, {
      banned,
      robots,
      accept: "text/html,*/*;q=0.5",
      maxBytes: MAX_PAGE_BYTES,
    });
    if (isPdf(fetched)) throw new Unreadable("the address is a PDF");
    return { url: fetched.finalUrl, links: pageLinks(bodyText(fetched), fetched.finalUrl) };
  };
  let home: Awaited<ReturnType<typeof open>>;
  try {
    home = await open(start);
  } catch (error) {
    const www = start.replace(/^https:\/\/(?!www\.)/, "https://www.");
    if (www === start) throw error;
    home = await open(www);
  }
  if (isVacanciesSite(home.url)) return home.links.length ? home.url : null;
  const careers = careersLink(home.links, home.url);
  if (!careers) return null;
  await open(careers.url);
  return careers.url;
}

// The morning run on or off for this business
export async function setMorningRun(member: CurrentMember, on: boolean) {
  assertCan(member, "manageJobSources");
  await repo.setMorningRun(member.tenant.id, on);
  return { ok: true as const };
}

export async function checkJobSourceNow(member: CurrentMember, id: string): Promise<CheckOutcome> {
  assertCan(member, "manageJobSources");
  return checkSource(member.tenant.id, id, member.id);
}

// On/off. Switching a source back on starts its failure count again.
export async function setJobSourceEnabled(member: CurrentMember, id: string, enabled: boolean) {
  assertCan(member, "manageJobSources");
  const source = await repo.findSource(member.tenant.id, id);
  if (!source) return { ok: false as const, error: "Job source not found." };
  await repo.updateSource(member.tenant.id, id, { enabled, ...(enabled ? { failures: 0, lastError: null } : {}) });
  return { ok: true as const };
}

// Removing a source keeps the jobs it already found (in Bulk post and on the board)
export async function removeJobSource(member: CurrentMember, id: string) {
  assertCan(member, "manageJobSources");
  const source = await repo.findSource(member.tenant.id, id);
  if (!source) return { ok: false as const, error: "Job source not found." };
  await tenantDb(member.tenant.id).jobSource.delete({ where: { id } });
  return { ok: true as const };
}

// The business's own banned sites (one per line or comma). Sources on a newly banned site are switched off.
export async function saveBannedSites(member: CurrentMember, text: string) {
  assertCan(member, "manageJobSources");
  const tenantId = member.tenant.id;
  const sites = cleanBannedSites(text.split(/[\n,]+/));
  await tenantDb(tenantId).businessSettings.updateMany({ data: { bannedJobSites: sites } });
  const stopped: string[] = [];
  for (const source of await repo.listSources(tenantId)) {
    if (source.enabled && bannedSite(source.url, sites)) {
      await repo.updateSource(tenantId, source.id, {
        enabled: false,
        lastError: "This site is now on the banned list",
      });
      stopped.push(source.name);
    }
  }
  return { ok: true as const, sites, stopped };
}

// "kra.go.ke/careers" → "https://kra.go.ke/careers"; null when it isn't a web address
export function normaliseUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed || /\s/.test(trimmed)) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (!siteName(url.toString())) return null;
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}
