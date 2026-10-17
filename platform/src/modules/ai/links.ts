// Links in the text that came with a poster ("Apply here: https://lnkd.in/..."). Pure, so the
// browser can count them for the progress bar and the tests can check them.

// At most this many links are opened for one poster
export const MAX_LINKS = 6;

// What happened when the website tried to open a link
export type LinkResult = {
  // As written in the text
  url: string;
  // Where it really led (after LinkedIn's "you're leaving LinkedIn" page and any redirects)
  finalUrl: string | null;
  ok: boolean;
  // Why it couldn't be read, in plain words
  reason: string | null;
};

const LINK = /\bhttps?:\/\/[^\s<>"'`]+/gi;

// Every distinct link in the text, without trailing punctuation ("…/apply)." → "…/apply")
export function findLinks(text: string): string[] {
  const found = (text.match(LINK) ?? []).map((link) => link.replace(/[.,;:!?)\]}*]+$/, ""));
  return [...new Set(found)].slice(0, MAX_LINKS);
}

// "https://career55.sapsf.eu/sfcareer/…" → "career55.sapsf.eu"
export function siteOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// The longest page text the AI is given per link (about 2,500 tokens): enough for a full job description
export const MAX_PAGE_CHARS = 10_000;

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  bull: "•",
};

function decodeEntities(text: string): string {
  return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (whole, code: string) => {
    if (code[0] !== "#") return ENTITIES[code.toLowerCase()] ?? whole;
    const value = code[1] === "x" || code[1] === "X" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
    return Number.isFinite(value) && value > 0 && value < 0x110000 ? String.fromCodePoint(value) : whole;
  });
}

// A web page's readable text: no scripts, styles or menus' markup, one line per block, trimmed to size
export function htmlToText(html: string): string {
  const text = html
    .replace(/<(script|style|noscript|svg|template|iframe)\b[\s\S]*?<\/\1\s*>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr|\/section|\/article|\/ul|\/ol)\b[^>]*>/gi, "\n")
    .replace(/<li\b[^>]*>/gi, "\n• ")
    .replace(/<[^>]+>/g, " ");
  return decodeEntities(text)
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line && line !== "•")
    .join("\n")
    .slice(0, MAX_PAGE_CHARS);
}

// LinkedIn's short links (lnkd.in) open a "you're leaving LinkedIn" page; the real address is the
// first link on it that isn't LinkedIn's own
export function leavingLinkedInTarget(html: string): string | null {
  for (const match of html.matchAll(/href="(https?:\/\/[^"]+)"/gi)) {
    const href = decodeEntities(match[1]);
    if (!/(^|\.)(linkedin\.com|licdn\.com|lnkd\.in)$/i.test(siteOf(href))) return href;
  }
  return null;
}
