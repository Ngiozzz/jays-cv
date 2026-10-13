# finance

The owner's money screen: takings, fees, writer pay, what the owner keeps, and payouts to writers.

- **Owner only.** Every service function calls `assertCan(member, "manageFinance")`; writers never see money.
- **Takings** are confirmed `Payment` rows tied to an order, counted by when they were confirmed. Payments
  that reached the Paybill without an order are counted separately ("not linked to an order").
- **Writer pay is earned on delivery**: each delivered order earns its writer `amount × payPercent`, rounded
  to whole shillings. The owner writing a CV earns nothing extra. "Owed now" is everything earned minus
  every payout recorded, never below zero.
- **Payouts** are recorded after the owner has sent the money by M-Pesa; the app doesn't send money. A
  payout can't be more than is owed, and an M-Pesa code can only be recorded once.
- Periods (`month`, `30`, `all`) use Nairobi time: "this month" starts at midnight on the 1st in Kenya.
- `finance.rules.ts` holds the pure maths (unit-tested), `finance.repo.ts` the Prisma queries (all through
  `tenantDb()`), `finance.service.ts` puts them together for the page, the actions and the CSV download.

Writer pay uses each writer's current pay %. When Orders are built, copy the writer's share onto the order
at delivery so a later pay change doesn't alter past earnings.
