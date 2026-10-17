import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { htmlToText, leavingLinkedInTarget, siteOf, type LinkResult } from "./links";

// Opens the links that came with a poster and reads the job text on them, so the AI can fill in
// what the poster leaves out. Only ordinary public web pages: no sign-ins, no private addresses,
// a time limit and a size limit, and a page that can't be read is reported, never guessed.

export type LinkPage = LinkResult & { text: string | null };

const TIMEOUT_MS = 10_000;
const MAX_BYTES = 2_000_000;
const MAX_HOPS = 6;
// Less readable text than this means the page only works in a browser (or is a sign-in wall)
const MIN_TEXT = 300;

class Unreadable extends Error {}

export async function readLinks(urls: string[]): Promise<LinkPage[]> {
  return Promise.all(urls.map(readLink));
}

async function readLink(url: string): Promise<LinkPage> {
  let current = url;
  try {
    for (let hop = 0; hop < MAX_HOPS; hop++) {
      const target = await safeUrl(current);
      if (/(^|\.)linkedin\.com$/i.test(target.hostname) && !target.pathname.startsWith("/redir")) {
        throw new Unreadable("LinkedIn pages need a sign-in");
      }
      const response = await fetch(target, {
        redirect: "manual",
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: {
          "user-agent": "Mozilla/5.0 (compatible; JayCVSJobsBot/1.0)",
          accept: "text/html,text/plain;q=0.9",
        },
      });
      const next = response.headers.get("location");
      if (response.status >= 300 && response.status < 400 && next) {
        current = new URL(next, target).toString();
        continue;
      }
      if (!response.ok) throw new Unreadable(`the site answered "${response.status}"`);
      const type = response.headers.get("content-type") ?? "";
      if (!/text\/html|text\/plain/i.test(type)) throw new Unreadable("it isn't a web page");
      const html = await limitedText(response);
      if (target.hostname.toLowerCase() === "lnkd.in") {
        const real = leavingLinkedInTarget(html);
        if (!real) throw new Unreadable("LinkedIn didn't say where it leads");
        current = real;
        continue;
      }
      const text = htmlToText(html);
      if (text.length < MIN_TEXT) throw new Unreadable("the page only works in a web browser");
      return { url, finalUrl: current, ok: true, reason: null, text };
    }
    throw new Unreadable("it redirects too many times");
  } catch (error) {
    const reason =
      error instanceof Unreadable
        ? error.message
        : error instanceof Error && error.name === "TimeoutError"
          ? "the site took too long to answer"
          : "the site couldn't be reached";
    if (!(error instanceof Unreadable)) console.warn(`[links] ${siteOf(current)}:`, error);
    return { url, finalUrl: current === url ? null : current, ok: false, reason, text: null };
  }
}

// Only http(s) on the usual ports, and only addresses on the public internet
async function safeUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Unreadable("it isn't a web address");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Unreadable("it isn't a web address");
  if (url.port && url.port !== "80" && url.port !== "443") throw new Unreadable("it uses an unusual port");
  if (url.username || url.password) throw new Unreadable("it asks for a sign-in");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(host) ? [host] : (await lookup(host, { all: true })).map((a) => a.address);
  if (!addresses.length || addresses.some(isPrivateAddress)) throw new Unreadable("it isn't a public website");
  return url;
}

export function isPrivateAddress(address: string): boolean {
  const ip = address.toLowerCase().replace(/^::ffff:/, "");
  if (isIP(ip) === 4) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 224
    );
  }
  return ip === "::" || ip === "::1" || /^f[cd]/.test(ip) || /^fe[89ab]/.test(ip);
}

// The body as text, stopping at MAX_BYTES so a huge file can't fill the server's memory
async function limitedText(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (size < MAX_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.length;
  }
  await reader.cancel().catch(() => {});
  return new TextDecoder().decode(Buffer.concat(chunks));
}
