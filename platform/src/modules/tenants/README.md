# tenants

Each business on the platform is a tenant (Jay CVS is the first).

- `src/proxy.ts` matches the request's domain to a business (`Tenant.domain`), falling back to
  `DEFAULT_TENANT_SLUG` for localhost and preview deployments. Public pages are rewritten to `/<slug>/…`
  so each business's pages are cached separately; the admin and API get the slug in the `x-tenant-slug` header.
- `getTenant(slug)` is cached; `getRequestTenant()` is for request-time code (admin, route handlers).
- The `Tenant` table is the only one read without a business filter, because it's how we find the business.
