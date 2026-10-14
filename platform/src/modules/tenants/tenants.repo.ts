import "server-only";
import { db } from "@/lib/db";

// Tenants are the one table looked up before a business is known, so it uses the shared client

const PUBLIC_FIELDS = { id: true, slug: true, name: true, orderPrefix: true, domain: true } as const;

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

// Hands out the business's next order number. One atomic database step, so two orders placed at the
// same moment always get different numbers (a number is skipped if its order then fails to save).
export async function takeOrderNumber(tenantId: string): Promise<number> {
  const { nextOrderNumber } = await db.tenant.update({
    where: { id: tenantId },
    data: { nextOrderNumber: { increment: 1 } },
    select: { nextOrderNumber: true },
  });
  return nextOrderNumber - 1;
}
