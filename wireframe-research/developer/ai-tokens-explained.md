# AI tokens as a business: how my SaaS model works

> **How to use this file:** paste it into a Claude chat and ask questions such as
> "Explain section 3 like I'm new to this" or "Check my token packages: am I making money?"
> (more suggested questions at the end).

---

## 1. Who's who

| Person | Role |
|---|---|
| **Me** | The developer and CEO of a small SaaS business. I build websites with AI features for clients and I run the AI on **my own** AI account. |
| **Jay** | My first client. He owns **Jay CVS**, a Kenyan CV-writing business (jaycvs.co.ke). He has a small team of writers. |
| **AI provider** | The company whose AI model I use, e.g. Anthropic (Claude), OpenAI (GPT) or Google (Gemini). They charge **me**, not Jay. |

Jay's website uses AI to:
- read job posters and turn them into job adverts (about **1,200 posters a month**, the biggest use)
- analyse clients' CVs and draft parts of them for the writers (about **120 orders a month**)

---

## 2. What a "token" is

- AI providers measure usage in **tokens**. A token is roughly ¾ of a word, or about 4 letters.
- Everything **sent to** the AI is **input tokens**: instructions, the poster image, a CV.
- Everything the AI **writes back** is **output tokens**.
- Output tokens cost more than input tokens, often **4–5× more**.
- Providers quote prices **per 1 million tokens**. Example, Claude Haiku 4.5: **$1 per 1M input**, **$5 per 1M output**.

**Real sizes in Jay CVS:**

| Action | Tokens in | Tokens out | Total |
|---|---|---|---|
| Read one job poster | ~1,600–1,800 | ~430–450 | **~2,000** |
| Analyse one CV | ~2,050 | ~560 | ~2,600 |
| Draft a CV summary | ~900 | ~190 | ~1,100 |

A normal month for Jay CVS uses about **3.6 million tokens**. Poster reading is over 80% of that.

---

## 3. The model: I'm a token reseller

```
 AI provider  ◄── I pay them (my one account, in US dollars)
      ▲
      │  every AI request from Jay's site goes through MY server
      │
 My system  ── counts tokens per client (Jay CVS, Business X, …)
      ▲
      │  Jay sees a TOKEN BALANCE (no prices, no dollars)
      │
 Jay's admin  ── "397,700 tokens left ≈ 195 posters"
      │
      └── when low, Jay asks me for more tokens and pays me
          (e.g. KES 500 or KES 2,000 by M-Pesa)
```

**Key points:**
1. **I hold the API key.** Jay never gets it. All AI calls go through my server, which records how many tokens each client used.
2. **Jay gets a starter balance of 1,000,000 tokens** when his site launches.
3. **Jay only ever sees tokens,** never what they cost me. His admin shows the balance, what it was used for, and a warning when it's low.
4. **When tokens run out,** the AI buttons pause and everything else on his site keeps working. He asks me for more, pays me, and I add tokens to his balance.
5. **The same system works for many clients.** Each client has their own balance on my one AI account.

---

## 4. Prepaid vs postpaid: does it matter to this model?

| Billing type | How it works | Who does this |
|---|---|---|
| **Prepaid** | I load money first (e.g. $20) and it's used up as I go. At $0 the AI stops until I top up. Auto-reload is available. | Anthropic (Claude) and OpenAI (GPT) for most accounts |
| **Postpaid** | I use it first and get billed later. | Google (Gemini) via Google Cloud. Claude via AWS or Azure. Anthropic directly only through a sales/invoicing deal for big customers. |

**Neither one changes the reseller model.** My clients pay **me** for tokens, and I use that money to keep my provider account topped up. With prepaid I'm paid by Jay **before** I spend, which is safe cash flow. With postpaid I must set budget alerts so a bug can't create a surprise bill.

Paying from Kenya: providers charge in **US dollars by card** (no M-Pesa). I need a card that works for international online payments. Bank conversion fees may apply.

---

## 5. The numbers

**What tokens cost me** (KES 130 = $1):

| Model | My cost for 1M tokens of Jay's usage mix |
|---|---|
| Claude Haiku 4.5 | ≈ KES 235 |
| Gemini Flash-Lite for posters + Haiku for CVs | ≈ KES 60 |

**How long 1M tokens lasts Jay:** about **450 posters**, which is roughly **8 days** at his normal volume. So **1M works as a starter/trial**, and paid packages should be bigger.

**Example packages:**

| Package | Tokens | Jay pays me | My cost (Haiku) | My margin |
|---|---|---|---|---|
| Starter (once, included) | 1M | KES 0 | ≈ 235 | (trial) |
| Top-up | 1M | KES 500 | ≈ 235 | ≈ 265 (53%) |
| Bundle | 5M | KES 2,000 | ≈ 1,175 | ≈ 825 (41%) |
| Big bundle | 15M | KES 5,000 | ≈ 3,525 | ≈ 1,475 |

At normal volume, Jay would use roughly **KES 1,500–2,000 of top-ups a month**, on top of my monthly maintenance fee (**KES 5,000**, which covers hosting and my support). If I switch poster reading to a cheaper model, my margin on the same packages roughly **triples**.

---

## 6. How this information helps me as the developer and CEO

| What I can see | What it lets me decide |
|---|---|
| Each client's tokens used, my cost, and what they paid | **Is this client profitable?** Should I change their price or package? |
| Which packages clients buy and how fast they use them | **Are my packages priced right?** Should I offer bigger bundles? |
| All clients' daily usage combined | **When will my provider balance run out?** When to top up so no client's AI stops. |
| Tokens by feature (posters vs CV tools) | **Which model to use where.** Cheap models on high-volume features is where the margin comes from. |
| Sudden usage spikes | **Catch bugs or abuse early,** e.g. a poster read in a loop, or bots hitting a free tool. |
| A client's usage growing month by month | **When to upsell** a bigger bundle or a new AI feature. |
| Which AI features are used a lot vs rarely | **What to build next and what to drop.** |
| Real results ("1,200 posters read last month at ~2,000 tokens each") | **A proven sales story** for the next client. |
| A per-client usage history | **Fair contracts:** I can show a client exactly what they used. |

In one line: **Jay sees how many tokens he has left; I see whether the business is making money.**

---

## 7. What's already built (design preview)

- **Jay's admin, Dashboard → "AI tokens" panel:** tokens left (starting from 1,000,000), ≈ posters' worth, % left, a breakdown of what tokens were used for, and a low-balance warning. **No money is shown.**
- **Jay's admin, Business settings:** "Warn me when tokens left drop below 10 / 20 / 30 / 50%".
- **When tokens hit zero:** AI buttons pause with "Out of AI tokens. Ask your developer to add more." (writers see "Jay needs to top up").
- **My developer pages** (Jay never sees these):
  - `developer/ai-costs.html`: the cost console. Real token counts and costs per month, my fee vs my costs, busy-month scenarios, every model compared.
  - `developer/ai-features.html`: all 16 possible AI features, each with tokens per use, cost per use and monthly cost, and which ones fit inside my fee.

**Not built yet:** a "Clients & tokens" page for me (all clients' balances, adding tokens after payment) and automatic top-ups paid by M-Pesa.

---

## 8. Risks and rules

1. **Never share my API key** with clients. All calls go through my server.
2. **Provider terms:** building AI features into clients' apps on my own key is normal. Reselling raw API access isn't. I'm responsible for how my clients use it.
3. **Client CVs contain personal data:** use paid API keys, not free tiers (free tiers may use data for training).
4. **Public AI tools** (e.g. a free CV check on the website) can be used by anyone, so they need limits per phone number per day and a monthly cap.
5. **Prices change:** check the providers' pricing pages before quoting a client.
6. **Keep records** of token sales and AI bills for tax.

---

## 9. Glossary

- **Token:** a small piece of text (~¾ of a word) that AI providers count and charge for.
- **Input / output tokens:** what I send to the AI / what it writes back. Output costs more.
- **API key:** the secret password that lets my server use the AI provider. Only I hold it.
- **Prepaid / postpaid:** pay before using / pay after using.
- **Auto-reload:** the provider automatically tops up my prepaid balance when it gets low.
- **Reseller / credits model:** I buy AI usage wholesale and sell it to clients as token balances.
- **Margin:** what I charge the client minus what it costs me.

---

## 10. Questions I can ask Claude about this

- "Explain the reseller model in section 3 in simpler words, with an everyday example."
- "If Jay reads 2,000 posters a month, how many tokens is that and what would it cost me?"
- "Are my token packages in section 5 priced well? Suggest better ones."
- "Should I sell tokens, or 'credits' where 1 poster = 1 credit? Which is easier for clients?"
- "What should my contract with Jay say about AI tokens, top-ups and what happens at zero?"
- "How do I safely add a second client (Business X) to the same AI account?"
- "Draft a WhatsApp message to Jay explaining his token balance and top-up packages."
