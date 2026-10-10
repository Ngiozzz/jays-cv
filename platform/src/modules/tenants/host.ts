// "www.jaycvs.co.ke:443" → "jaycvs.co.ke": businesses are stored by their bare domain
export function domainFromHost(host: string | null): string | null {
  if (!host) return null;
  const bare = host
    .trim()
    .toLowerCase()
    .split(":")[0]
    .replace(/^www\./, "");
  return bare || null;
}

// The request header the proxy uses to tell pages which business they are serving
export const TENANT_HEADER = "x-tenant-slug";
