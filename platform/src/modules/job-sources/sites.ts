// Which sites a job source may read. Job boards forbid copying their listings in their terms, and
// reposting them would make Jay's board a copy of theirs in Google's eyes, so they are refused.
// The business can add more sites in Job sources; these built-in ones can't be removed.

export const BUILT_IN_BANNED_SITES = [
  "linkedin.com",
  "lnkd.in",
  "brightermonday.co.ke",
  "brightermonday.com",
  "fuzu.com",
  "myjobmag.co.ke",
  "myjobmag.com",
  "myjobsinkenya.com",
  "careerpointkenya.co.ke",
  "kenyajob.com",
  "jobwebkenya.com",
  "corporatestaffing.co.ke",
  "careergo.co.ke",
  "indeed.com",
  "glassdoor.com",
  "jobberman.com",
] as const;

// "https://www.Fuzu.com/jobs" / "fuzu.com" / "*.fuzu.com" → "fuzu.com"; null when it isn't a site
export function siteName(input: string): string | null {
  const trimmed = input.trim().toLowerCase().replace(/^\*\./, "");
  if (!trimmed) return null;
  let host: string;
  try {
    host = new URL(/^[a-z][a-z0-9+.-]*:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`).hostname;
  } catch {
    return null;
  }
  host = host.replace(/^www\./, "").replace(/\.$/, "");
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host) ? host : null;
}

// The banned site this address belongs to (a subdomain counts: ke.linkedin.com → linkedin.com), or null
export function bannedSite(url: string, extra: readonly string[] = []): string | null {
  const host = siteName(url);
  if (!host) return null;
  const banned = [...BUILT_IN_BANNED_SITES, ...extra.map(siteName).filter((site): site is string => Boolean(site))];
  return banned.find((site) => host === site || host.endsWith(`.${site}`)) ?? null;
}

// The business's own extra list, cleaned: real site names only, no repeats, none already built in
export function cleanBannedSites(input: readonly string[]): string[] {
  const sites = input.map(siteName).filter((site): site is string => Boolean(site));
  return [...new Set(sites)].filter((site) => !bannedSite(`https://${site}`)).slice(0, 100);
}
