import type { FoundLink } from "./discover";
import { siteName } from "./sites";

// Suggesting job sources from the jobs the business already posts, and finding a company's careers
// page from its website. Pure, so it can be tested without the internet or the database.

// Free email providers: an address there says nothing about the employer's website
const FREE_MAIL = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.co.uk",
  "ymail.com",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "msn.com",
  "icloud.com",
  "me.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "mail.com",
  "gmx.com",
  "zohomail.com",
]);

// Links that lead to a form or a hiring system shared by many companies, not the employer's own site.
// (Their pages are built in the browser, so they can't be read here anyway.)
const NOT_AN_EMPLOYER_SITE =
  /(^|\.)(google\.com|forms\.gle|bit\.ly|tinyurl\.com|sapsf\.(eu|com)|successfactors\.(eu|com)|myworkdayjobs\.com|workday\.com|taleo\.net|icims\.com|smartrecruiters\.com|workable\.com|bamboohr\.com|breezy\.hr|zohorecruit\.com|recruitee\.com|jotform\.com|typeform\.com|wa\.me|whatsapp\.com|facebook\.com|t\.me)$/i;

// Hiring boards whose company pages are plain web pages: boards.greenhouse.io/<company>, jobs.lever.co/<company>
const COMPANY_BOARD = /^(boards\.greenhouse\.io|job-boards\.greenhouse\.io|jobs\.lever\.co)$/i;

export type PostedJob = { company: string; apply: { method?: string; url?: string; email?: string } };

export type SourceSuggestion = {
  // The employer's website ("kilimall.com"), or a company's page on a hiring board
  site: string;
  // Where to start looking for the vacancies page
  start: string;
  company: string;
  jobs: number;
};

// Where a posted job's employer has its own website: its apply link, else its email's domain
export function employerSite(job: PostedJob): { site: string; start: string } | null {
  if (job.apply.method === "link" && job.apply.url) {
    let url: URL;
    try {
      url = new URL(job.apply.url.trim());
    } catch {
      return null;
    }
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (COMPANY_BOARD.test(host)) {
      const company = url.pathname.split("/").filter(Boolean)[0];
      return company ? { site: `${host}/${company}`, start: `https://${host}/${company}` } : null;
    }
    if (NOT_AN_EMPLOYER_SITE.test(host)) return null;
    const site = siteName(host);
    return site ? { site, start: `https://${site}/` } : null;
  }
  if (job.apply.method === "email" && job.apply.email?.includes("@")) {
    const domain = job.apply.email.split("@").pop()!.trim().toLowerCase();
    if (FREE_MAIL.has(domain) || NOT_AN_EMPLOYER_SITE.test(domain)) return null;
    const site = siteName(domain);
    return site ? { site, start: `https://${site}/` } : null;
  }
  return null;
}

// Employers from the posted jobs, most-posted first, leaving out sites already used or set aside
export function suggestSources(jobs: PostedJob[], skip: (site: string) => boolean, limit = 30): SourceSuggestion[] {
  const bySite = new Map<string, { start: string; companies: Map<string, number>; jobs: number }>();
  for (const job of jobs) {
    const found = employerSite(job);
    if (!found || skip(found.site)) continue;
    const entry = bySite.get(found.site) ?? { start: found.start, companies: new Map(), jobs: 0 };
    const company = job.company.trim();
    if (company) entry.companies.set(company, (entry.companies.get(company) ?? 0) + 1);
    entry.jobs += 1;
    bySite.set(found.site, entry);
  }
  return [...bySite.entries()]
    .map(([site, entry]) => ({
      site,
      start: entry.start,
      // The name used most often for this employer
      company: [...entry.companies.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? site,
      jobs: entry.jobs,
    }))
    .sort((a, b) => b.jobs - a.jobs || a.company.localeCompare(b.company))
    .slice(0, limit);
}

// Whether two addresses are on the same employer's website (www. and subdomains count:
// careers.kcbgroup.com belongs to kcbgroup.com)
export function sameEmployerSite(a: string, b: string): boolean {
  const x = siteName(a);
  const y = siteName(b);
  if (!x || !y) return false;
  return x === y || x.endsWith(`.${y}`) || y.endsWith(`.${x}`);
}

const CAREERS_WORDS =
  /\b(careers?|vacanc(y|ies)|jobs?|job openings?|current openings|work (with|for) us|join (us|our team|the team)|opportunities|recruitment|employment)\b/i;
// Pages that mention careers but aren't vacancies: tenders, news, an HR agency's "recruitment services"
const NOT_CAREERS =
  /\b(tenders?|procurement|results?|shortlist|news|blog|student|admission|courses?|services?|head ?hunting|solutions)\b/i;

// The link on a company's homepage that most likely leads to its vacancies, or null
export function careersLink(links: FoundLink[], homeUrl: string): FoundLink | null {
  let best: { link: FoundLink; score: number } | null = null;
  for (const link of links) {
    if (!sameEmployerSite(link.url, homeUrl)) continue;
    const words = link.text;
    let path = "";
    try {
      path = decodeURIComponent(new URL(link.url).pathname);
    } catch {
      continue;
    }
    let score = 0;
    if (CAREERS_WORDS.test(words)) score += 3;
    if (/vacanc|career|jobs?\b|recruit/i.test(path)) score += 2;
    if (/vacanc/i.test(words + path)) score += 1;
    if (/^(careers?|jobs|recruit(ment)?)\./i.test(new URL(link.url).hostname)) score += 2;
    if (NOT_CAREERS.test(words) || NOT_CAREERS.test(path.replace(/[-_/]/g, " ")) || /\.pdf$/i.test(path)) score -= 4;
    // A dated post (/2026/10/20/one-vacancy/) or a deep page is one advert, not the vacancies page
    if (/\/(19|20)\d{2}\/\d{1,2}\//.test(path)) score -= 3;
    score -= Math.max(0, path.split("/").filter(Boolean).length - 2);
    if (score >= 2 && (!best || score > best.score)) best = { link, score };
  }
  return best?.link ?? null;
}

// A site that is itself the vacancies site: a hiring subdomain (recruitment.mpshahhosp.org) or a
// company's page on a hiring board (jobs.lever.co/acme)
export function isVacanciesSite(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    return COMPANY_BOARD.test(host) || /^(careers?|jobs|recruit(ment)?|vacanc(y|ies)|hiring)\./.test(host);
  } catch {
    return false;
  }
}

// "Kilimall" → "Kilimall careers"
export function sourceNameFor(company: string): string {
  const name = company.trim().replace(/\s+/g, " ").slice(0, 60);
  return /\b(careers?|jobs|vacancies)\b/i.test(name) ? name : `${name} careers`;
}
