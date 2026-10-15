// Pure rules for limiting a query to one business. Kept apart from tenant-db.ts so they can be unit-tested.

export const TENANT_MODELS = [
  "BusinessSettings",
  "Homepage",
  "AboutPage",
  "Membership",
  "Invite",
  "Job",
  "Company",
  "InboxItem",
  "Order",
  "OrderRevision",
  "OrderEvent",
  "Payment",
  "WriterPayout",
  "StoredFile",
  "Package",
  "Service",
  "Review",
  "Sample",
  "Post",
  "Faq",
  "ContentChange",
  "TokenLedgerEntry",
  "TrackingAttempt",
  "CancelledOrder",
  "CvCheck",
  "OrderAiResult",
] as const;

export type TenantModel = (typeof TENANT_MODELS)[number];

const WHERE_OPERATIONS = new Set([
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
  "update",
  "updateMany",
  "updateManyAndReturn",
  "delete",
  "deleteMany",
]);
const CREATE_OPERATIONS = new Set(["create", "createMany", "createManyAndReturn"]);

type Args = Record<string, unknown>;

export function isTenantModel(model: string | undefined): model is TenantModel {
  return TENANT_MODELS.includes(model as TenantModel);
}

const withTenant = (data: unknown, tenantId: string) =>
  Array.isArray(data) ? data.map((row: Args) => ({ ...row, tenantId })) : { ...(data as Args), tenantId };

// Returns new query arguments that can only read or write rows of `tenantId`.
// Any tenantId the caller passed is overwritten, so a bug can't write into another business.
export function scopeArgs(operation: string, args: Args | undefined, tenantId: string): Args {
  const base = args ?? {};
  if (WHERE_OPERATIONS.has(operation)) {
    return { ...base, where: { ...(base.where as Args | undefined), tenantId } };
  }
  if (CREATE_OPERATIONS.has(operation)) {
    return { ...base, data: withTenant(base.data, tenantId) };
  }
  if (operation === "upsert") {
    return {
      ...base,
      where: { ...(base.where as Args | undefined), tenantId },
      create: withTenant(base.create, tenantId),
    };
  }
  throw new Error(`Operation "${operation}" is not allowed on a business-scoped client`);
}
