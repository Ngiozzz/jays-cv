import { NextResponse, type NextRequest } from "next/server";
import { TENANT_HEADER } from "@/modules/tenants/host";
import { tenantSlugForHost } from "@/modules/tenants/tenants.service";

// Domains rarely change, so remember each host's business for a minute instead of asking the database per request
const HOST_CACHE_MS = 60_000;
const hostCache = new Map<string, { slug: string; until: number }>();

async function slugFor(host: string | null): Promise<string> {
  const key = host ?? "";
  const hit = hostCache.get(key);
  if (hit && hit.until > Date.now()) return hit.slug;
  const slug = await tenantSlugForHost(host);
  hostCache.set(key, { slug, until: Date.now() + HOST_CACHE_MS });
  return slug;
}

// Every request learns which business it serves here, and nowhere else.
// Public pages are rewritten to /<business>/… so each business's pages can be cached separately;
// the admin and API read the business from a request header.
export async function proxy(request: NextRequest) {
  const slug = await slugFor(request.headers.get("host"));
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(TENANT_HEADER, slug);

  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/admin") || pathname.startsWith("/api")) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }
  const url = request.nextUrl.clone();
  url.pathname = `/${slug}${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
}

export const config = {
  // Skip Next.js internals and static files (anything with a file extension)
  matcher: ["/((?!_next|.*\\..*).*)"],
};
