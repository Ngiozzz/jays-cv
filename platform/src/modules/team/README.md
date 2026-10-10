# team

Who works for each business and what they may do.

- **Sign-in is Google only and invite-only.** `sign-in.service.ts` is called by the auth hooks in
  `src/lib/auth.ts`: an account can only be created for an email with a pending invite, and a session is
  refused unless the person has an active membership somewhere. New invites are accepted at sign-in.
- **Every admin request re-checks the membership** (`current-member.ts`): pausing or removing someone
  blocks them on their next click, without waiting for their session to expire.
- **Roles and permissions** (`permissions.ts`): the owner can do everything; writers can accept orders
  and post jobs only if their switches allow it, and never see money. Server code calls
  `requirePermission()`; hiding a button is never the only protection.
- `invites.ts` holds the pure invite rules; `team.repo.ts` the Prisma queries. Invite lookups by email
  cross businesses on purpose (we don't know the business before sign-in); everything else is scoped
  with `tenantDb()`.
