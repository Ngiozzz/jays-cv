import "server-only";
import { db } from "@/lib/db";

// Tenants are the one table looked up before a business is known, so it uses the shared client

const PUBLIC_FIELDS = { id: true, slug: true, name: true, orderPrefix: true } as const;

export function findTenantBySlug(slug: string) {
  return db.tenant.findUnique({ where: { slug }, select: PUBLIC_FIELDS });
}

export function findTenantSlugByDomain(domain: string) {
  return db.tenant.findUnique({ where: { domain }, select: { slug: true } });
}

export function listTenantSlugs() {
  return db.tenant.findMany({ select: { slug: true } });
}

export function listTenantIds() {
  return db.tenant.findMany({ select: { id: true, slug: true } });
}
