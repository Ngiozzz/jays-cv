import "server-only";
import { tenantDb } from "@/lib/tenant-db";

// Finds the company by its normalised name, or remembers it the first time it's used
export function upsertCompany(tenantId: string, name: string, nameKey: string) {
  return tenantDb(tenantId).company.upsert({
    where: { tenantId_nameKey: { tenantId, nameKey } },
    update: {},
    create: { tenantId, name, nameKey },
  });
}

export function findCompany(tenantId: string, id: string) {
  return tenantDb(tenantId).company.findUnique({ where: { id } });
}

export function findCompaniesWithJobCounts(tenantId: string) {
  return tenantDb(tenantId).company.findMany({
    select: { id: true, name: true, logoPath: true, _count: { select: { jobs: true } } },
  });
}

export function setCompanyLogo(tenantId: string, id: string, logoPath: string | null) {
  return tenantDb(tenantId).company.update({
    where: { id },
    data: { logoPath, logoUpdatedAt: logoPath ? new Date() : null },
  });
}
