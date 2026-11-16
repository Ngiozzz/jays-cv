import { htmlToText } from "@/modules/ai/links";

// Finding the jobs on a source's page: the links on a vacancies page, or the entries of a job feed
// (RSS/Atom). Pure, so it can be tested without the internet.

export type FoundLink = {
  url: string;
  // The link's words ("Senior Accountant – Apply by 30 Nov"), or a feed entry's title
  text: string;
};

// At most this many links from one page are looked at (a vacancies page rarely has more)
export const MAX_LINKS_PER_PAGE = 200;

// Links that are never job adverts: files, sign-ins, sharing buttons
const NOT_A_JOB =
  /\.(jpe?g|png|gif|webp|svg|css|js|zip|docx?|xlsx?|pptx?|mp4|mp3)(\?|#|$)|\/(login|signin|sign-in|register|signup|cart|wp-admin|wp-login)\b|^https?:\/\/([a-z0-9-]+\.)*(facebook|twitter|x|instagram|youtube|tiktok|whatsapp|wa|t)\.(com|me)\//i;

const ENTITY = /&(amp|quot|#39|apos|lt|gt);/g;
const ENTITIES: Record<string, string> = { amp: "&", quot: '"', "#39": "'", apos: "'", lt: "<", gt: ">" };
const decode = (value: string) => value.replace(ENTITY, (_, name: string) => ENTITIES[name]);

// Every distinct link on the page, as a full address, with its words. The page's own address and
// links within it (#apply) are left out.
export function pageLinks(html: string, pageUrl: string): FoundLink[] {
  const base = /<base\b[^>]*href\s*=\s*["']([^"']+)["']/i.exec(html)?.[1];
  let baseUrl: URL;
  try {
    baseUrl = new URL(base ? decode(base) : pageUrl, pageUrl);
  } catch {
    return [];
  }
  const self = withoutHash(pageUrl);
  const found = new Map<string, FoundLink>();
  const anchor = /<a\b([^>]*)>([\s\S]*?)<\/a\s*>/gi;
  for (let match = anchor.exec(html); match && found.size < MAX_LINKS_PER_PAGE; match = anchor.exec(html)) {
    const href = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(match[1]);
    const raw = href && decode((href[1] ?? href[2] ?? href[3] ?? "").trim());
    if (!raw || /^(#|mailto:|tel:|javascript:)/i.test(raw)) continue;
    let url: string;
    try {
      const parsed = new URL(raw, baseUrl);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") continue;
      url = withoutHash(parsed.toString());
    } catch {
      continue;
    }
    if (url === self || NOT_A_JOB.test(url)) continue;
    const title = /\btitle\s*=\s*["']([^"']*)["']/i.exec(match[1])?.[1] ?? "";
    const text = (htmlToText(match[2]).replace(/\s+/g, " ").trim() || decode(title)).slice(0, 200);
    const known = found.get(url);
    // The same job is often linked twice ("Senior Accountant" and "Read more"): keep the better words
    if (!known) found.set(url, { url, text });
    else if (text.length > known.text.length && !/^(read more|apply|view|details|more)\b/i.test(text))
      found.set(url, { url, text });
  }
  return [...found.values()];
}

function withoutHash(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return url;
  }
}

// Whether a downloaded page is a feed (RSS or Atom) rather than a web page
export function isFeed(contentType: string, body: string): boolean {
  if (/(rss|atom)\+xml/i.test(contentType)) return true;
  const start = body
    .slice(0, 600)
    .replace(/<\?xml[^>]*\?>/, "")
    .trim();
  return /^(<!--[\s\S]*?-->\s*)*<(rss|feed|rdf:RDF)\b/i.test(start);
}

// A job feed's entries: each one's link and title (RSS <item> or Atom <entry>)
export function feedLinks(xml: string, feedUrl: string): FoundLink[] {
  const found = new Map<string, FoundLink>();
  const entry = /<(item|entry)\b[\s\S]*?<\/\1\s*>/gi;
  for (let match = entry.exec(xml); match && found.size < MAX_LINKS_PER_PAGE; match = entry.exec(xml)) {
    const block = match[0];
    const title = cdata(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i.exec(block)?.[1] ?? "");
    const link =
      cdata(/<link\b[^>]*>([\s\S]*?)<\/link\s*>/i.exec(block)?.[1] ?? "") ||
      /<link\b[^>]*\bhref\s*=\s*["']([^"']+)["']/i.exec(block)?.[1] ||
      cdata(/<guid\b[^>]*>([\s\S]*?)<\/guid\s*>/i.exec(block)?.[1] ?? "");
    try {
      const url = withoutHash(new URL(decode(link.trim()), feedUrl).toString());
      if (!/^https?:/i.test(url) || found.has(url)) continue;
      found.set(url, { url, text: htmlToText(decode(title)).replace(/\s+/g, " ").trim().slice(0, 200) });
    } catch {
      continue;
    }
  }
  return [...found.values()];
}

function cdata(value: string): string {
  return value.replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, "$1").trim();
}

// Whether a link points at a PDF (government adverts are often PDFs)
export function looksLikePdf(url: string): boolean {
  return /\.pdf(\?|#|$)/i.test(url);
}

// Tracking bits added by newsletters, social media and ad platforms: the same page with or without them
const TRACKING =
  /^(utm_[a-z]+|fbclid|gclid|dclid|msclkid|mc_cid|mc_eid|igshid|_ga|_gl|ref|ref_src|source|trk|trackingId)$/i;

// One spelling for every way of writing the same link, so a job is only added (and read) once:
// lower-case site, no "www.", no #part, no tracking bits, other bits in a fixed order, no trailing "/"
export function canonicalUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    parsed.hostname = parsed.hostname.toLowerCase().replace(/^www\./, "");
    if (
      (parsed.protocol === "https:" && parsed.port === "443") ||
      (parsed.protocol === "http:" && parsed.port === "80")
    )
      parsed.port = "";
    const kept = [...parsed.searchParams.entries()]
      .filter(([key]) => !TRACKING.test(key))
      .sort(([a], [b]) => a.localeCompare(b));
    parsed.search = new URLSearchParams(kept).toString();
    if (parsed.pathname.length > 1) parsed.pathname = parsed.pathname.replace(/\/+$/, "");
    // http and https are the same page
    return parsed.toString().replace(/^http:/, "https:");
  } catch {
    return url;
  }
}
