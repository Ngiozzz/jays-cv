import "server-only";
import { safeUrl, Unreadable } from "@/modules/ai/link-reader";
import { BOT_NAME, robotsAllows } from "./robots";
import { bannedSite } from "./sites";

// Opens a job source's pages politely: only public websites, never a banned site, never a page the
// site's robots.txt closes to robots, one page at a time, with time and size limits.
// Every refusal is an Unreadable with a plain reason the owner can read.

export { Unreadable };

const TIMEOUT_MS = 15_000;
const MAX_HOPS = 6;
// A vacancies page or feed; job PDFs may be bigger (scanned adverts)
export const MAX_PAGE_BYTES = 3_000_000;
export const MAX_PDF_BYTES = 8_000_000;

export const USER_AGENT = `Mozilla/5.0 (compatible; ${BOT_NAME}/1.0; job adverts for a Kenyan jobs board)`;

export type Fetched = { finalUrl: string; contentType: string; body: Uint8Array };

// One run's memory of each site's robots.txt, so it is fetched once per site
export type RobotsCache = Map<string, string>;

export async function fetchPolitely(
  url: string,
  options: { banned: readonly string[]; robots: RobotsCache; accept: string; maxBytes: number },
): Promise<Fetched> {
  let current = url;
  for (let hop = 0; hop < MAX_HOPS; hop++) {
    const target = await safeUrl(current);
    const banned = bannedSite(target.toString(), options.banned);
    if (banned) throw new Unreadable(`${banned} doesn't allow its jobs to be copied`);
    if (!robotsAllows(await robotsFor(target, options.robots), target.toString())) {
      throw new Unreadable(`${target.hostname} asks robots not to read this page (robots.txt)`);
    }
    const response = await request(target, options.accept);
    const next = response.headers.get("location");
    if (response.status >= 300 && response.status < 400 && next) {
      await response.body?.cancel().catch(() => {});
      current = new URL(next, target).toString();
      continue;
    }
    if (!response.ok) {
      await response.body?.cancel().catch(() => {});
      throw new Unreadable(`the site answered "${response.status}"`);
    }
    return {
      finalUrl: target.toString(),
      contentType: response.headers.get("content-type") ?? "",
      body: await limitedBody(response, options.maxBytes),
    };
  }
  throw new Unreadable("it redirects too many times");
}

async function request(target: URL, accept: string): Promise<Response> {
  try {
    return await fetch(target, {
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "user-agent": USER_AGENT, accept },
    });
  } catch (error) {
    throw new Unreadable(
      error instanceof Error && error.name === "TimeoutError"
        ? "the site took too long to answer"
        : "the site couldn't be reached",
    );
  }
}

// The site's robots.txt (empty when it has none). A site whose robots.txt can't be fetched because
// the site is down is skipped for now rather than read without permission.
async function robotsFor(target: URL, cache: RobotsCache): Promise<string> {
  const origin = target.origin;
  const known = cache.get(origin);
  if (known !== undefined) return known;
  let text = "";
  const response = await request(new URL("/robots.txt", origin), "text/plain");
  if (response.ok) {
    text = new TextDecoder().decode(await limitedBody(response, 500_000));
  } else {
    await response.body?.cancel().catch(() => {});
    // No robots.txt (404 and the like) means robots are welcome; a broken site is tried another day
    if (response.status >= 500) throw new Unreadable("the site isn't working right now");
  }
  cache.set(origin, text);
  return text;
}

async function limitedBody(response: Response, maxBytes: number): Promise<Uint8Array> {
  const reader = response.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > maxBytes) {
      await reader.cancel().catch(() => {});
      throw new Unreadable("the page is too big");
    }
    chunks.push(value);
  }
  return new Uint8Array(Buffer.concat(chunks));
}

export function bodyText(fetched: Fetched): string {
  const charset = /charset=([\w-]+)/i.exec(fetched.contentType)?.[1] ?? "utf-8";
  try {
    return new TextDecoder(charset).decode(fetched.body);
  } catch {
    return new TextDecoder().decode(fetched.body);
  }
}

export function isPdf(fetched: Fetched): boolean {
  return /application\/pdf/i.test(fetched.contentType) || Buffer.from(fetched.body.slice(0, 5)).toString() === "%PDF-";
}
