# ai

AI runs on the developer's own Claude account; each business has a **token balance** (`TokenLedgerEntry`:
grants and top-ups are positive, usage is negative). The owner only ever sees tokens, never money.

- `tokens.ts`: pure balance maths (percentage left, low-balance warning from Business settings).
- `tokens.service.ts`: the balance for the admin dashboard.

The Claude client (with a "pretend" mode until `ANTHROPIC_API_KEY` is set) arrives with the Jobs inbox in phase 2.
