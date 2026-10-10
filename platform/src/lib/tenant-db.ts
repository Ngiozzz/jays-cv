import "server-only";
import { db } from "./db";
import { isTenantModel, scopeArgs } from "./tenant-scope";

// The only way modules reach business data: every query is limited to one tenant,
// so one business can never see or change another's rows.
export function tenantDb(tenantId: string) {
  return db.$extends({
    query: {
      $allModels: {
        $allOperations({ model, operation, args, query }) {
          if (!isTenantModel(model)) {
            throw new Error(`${model} is not business data; use the shared client in its repository`);
          }
          return query(scopeArgs(operation, args as Record<string, unknown>, tenantId) as typeof args);
        },
      },
    },
  });
}

export type TenantDb = ReturnType<typeof tenantDb>;
