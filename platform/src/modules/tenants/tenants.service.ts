import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { env } from "@/lib/env";
import { domainFromHost, TENANT_HEADER } from "./host";
import { findTenantBySlug, findTenantSlugByDomain, listTenantSlugs } from "./tenants.repo";

export type CurrentTenant = NonNullable<Awaited<ReturnType<typeof findTenantBySlug>>>;

// Unknown hosts (localhost, preview deployments) show the default business
export async function tenantSlugForHost(host: string | null): Promise<string> {
  const domain = domainFromHost(host);
  if (!domain) return env.DEFAULT_TENANT_SLUG;
  const match = await findTenantSlugByDomain(domain);
  return match?.slug ?? env.DEFAULT_TENANT_SLUG;
}

export async function getTenant(slug: string): Promise<CurrentTenant> {
  "use cache";
  cacheTag(`tenant:${slug}`);
  cacheLife("hours");
  const tenant = await findTenantBySlug(slug);
  if (!tenant) notFound();
  return tenant;
}

// For request-time code (admin, route handlers): the proxy already resolved the business
export async function getRequestTenant(): Promise<CurrentTenant> {
  const slug = (await headers()).get(TENANT_HEADER) ?? env.DEFAULT_TENANT_SLUG;
  return getTenant(slug);
}

export async function allTenantSlugs(): Promise<string[]> {
  return (await listTenantSlugs()).map((t) => t.slug);
}
