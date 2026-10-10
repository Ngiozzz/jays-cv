# Jay CVS platform

The real system behind the Jay CVS design preview (`../wireframe-research/`): public website, staff admin,
and later the jobs board, orders and M-Pesa payments. Multi-business from day one: Jay CVS is the first business.

**Stack:** Next.js 16 (App Router, Cache Components) · TypeScript (strict) · Prisma 7 + PostgreSQL (Supabase) ·
Better Auth (Google sign-in, invite-only) · Zod · Vitest · Playwright.

## First run

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill it in (never commit it, never paste keys into chat).
   - Supabase: `DATABASE_URL` = pooled connection (port 6543), `DIRECT_URL` = direct connection (port 5432).
   - `BETTER_AUTH_SECRET`: any random 32+ character string.
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`: Google Cloud OAuth client (web). Allowed redirect URI:
     `http://localhost:3000/api/auth/callback/google`.
   - `OWNER_EMAIL`: the Google address of the owner. The seed invites it so the owner can sign in first.
3. `npm run db:deploy` (create the tables) and `npm run db:seed` (Jay CVS + starting content + 1,000,000 AI tokens).
4. `npm run dev` and open http://localhost:3000 (website) or http://localhost:3000/admin.

No Supabase project yet? Any PostgreSQL works for development, e.g.
`docker run -d --name jaycvs-pg-dev -e POSTGRES_PASSWORD=devpass -e POSTGRES_DB=jaycvs -p 54329:5432 postgres:17-alpine`
with both URLs set to `postgresql://postgres:devpass@localhost:54329/jaycvs`.

## Scripts

| Command                           | What it does                                                         |
| --------------------------------- | -------------------------------------------------------------------- |
| `npm run check`                   | Formatting, lint, type-check and unit tests: run before every commit |
| `npm test`                        | Unit tests (pure rules, no database)                                 |
| `npm run test:int`                | Integration tests against the database in `.env.local`               |
| `npm run test:e2e`                | Browser tests (Playwright); needs a seeded database                  |
| `npm run db:migrate`              | Change the schema: edit `prisma/schema.prisma`, then run this        |
| `npm run db:seed`                 | Fill in missing starting content (never overwrites edits)            |
| `npm run format` / `npm run lint` | Prettier / ESLint                                                    |

## How the code is organised

```
src/
  proxy.ts          # works out which business a request is for (by domain); the only place that does
  app/              # routes only, kept thin
    (public)/[tenant]/   # website pages; the proxy rewrites /pricing → /<business>/pricing
    (admin)/admin/       # staff screens; (signed-in)/ requires an active team member
    api/auth/            # Better Auth (Google sign-in)
  modules/          # business logic, one folder per area: *.service.ts (rules) → *.repo.ts (Prisma)
    tenants/ team/ content/ ai/
  lib/              # plumbing: env (fails fast on missing keys), db, tenant-db, auth, money
  components/       # UI only, no business rules
  styles/           # the preview's CSS, unchanged apart from the font variables
prisma/schema.prisma  # the single source of truth for the database
```

Rules that keep it safe:

- **Every business query goes through `tenantDb(tenantId)`**, which adds the business filter to every read
  and write. A test checks that every table with a `tenantId` is covered.
- **Roles are checked on the server** (`requireMember()` / `requirePermission()`), never only by hiding buttons.
  Writers never see money.
- **Money is whole shillings** (integers) everywhere.
- **Public pages are cached per business** and tagged `content:<tenantId>`; saving content must call
  `updateTag(contentTag(tenantId))`.

## Build phases

1. **Foundation (done):** project setup, database schema, Google sign-in (invite-only), admin layout, public pages.
2. Jobs: jobs board, post a job, Jobs inbox. ("Find a job" returns to the menu then.)
3. Orders + M-Pesa (Daraja sandbox): order card, uploads, tracking page, writer workflow.
4. Jay's controls: Team, Finance, Website content, token balance, developer page.
5. Go live.
