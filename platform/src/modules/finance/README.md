# finance

The owner's money screen: takings, fees, the average order and what's still waiting to be paid.

- **Owner only.** Every service function calls `assertCan(member, "manageFinance")`; writers never see money.
- **Takings** are confirmed `Payment` rows tied to an order (or a paid CV check), counted by when they were
  confirmed. Payments that reached the Paybill without an order are counted separately ("not linked to an
  order").
- **Writers are on a monthly salary**, paid outside the app, so nothing is taken off per CV: the owner keeps
  takings less fees. (The old pay-per-CV columns, `payPercent` and the `WriterPayout` table, are still in the
  database but no longer used; they can be dropped in a later migration once their history isn't needed.)
- Periods (`month`, `30`, `all`) use Nairobi time: "this month" starts at midnight on the 1st in Kenya.
- `finance.rules.ts` holds the pure maths (unit-tested), `finance.repo.ts` the Prisma queries (all through
  `tenantDb()`), `finance.service.ts` puts them together for the page and the CSV download.
