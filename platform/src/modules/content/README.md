# content

Everything the owner edits in **Admin → Website content**: packages and prices, single services,
reviews, CV samples, career tips (posts), FAQs, homepage text and business settings.

- `content.repo.ts`: Prisma queries, always through `tenantDb()`.
- `content.service.ts`: cached reads for the public pages (`"use cache"`, tagged `content:<tenantId>`).
  Editing screens (phase 4) must call `updateTag(contentTag(tenantId))` after saving.
- `contact.ts`, `packages.ts`, `pricing.ts`: pure helpers for how content reads on the site.
- Prices are whole shillings. Only approved, consented, featured reviews ever reach the public site.
