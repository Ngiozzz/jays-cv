// M-Pesa rules shared by the website's pay box, the pretend phone and (later) Safaricom's callbacks.
// Pure: nothing is read or saved here.

// A Safaricom number as M-Pesa wants it, "2547XXXXXXXX" or "2541XXXXXXXX", however the client typed
// it (0712 345 678, +254 712-345-678, 712345678). null: not a Kenyan mobile number.
export function mpesaPhone(typed: string): string | null {
  const digits = typed.replace(/[\s()-]/g, "").replace(/^\+/, "");
  const match = /^(?:254|0)?([17]\d{8})$/.exec(digits);
  return match ? `254${match[1]}` : null;
}

// "0712 345 678": how the number is shown back to the client
export const localPhone = (mpesa: string) => `0${mpesa.slice(3, 6)} ${mpesa.slice(6, 9)} ${mpesa.slice(9)}`;

// A number from the order, shown the same way (left as typed if it isn't a Kenyan mobile)
export function displayPhone(typed: string): string {
  const mpesa = mpesaPhone(typed);
  return mpesa ? localPhone(mpesa) : typed;
}

// What's still to pay: the order price less every confirmed payment (payments add up, so a client
// who paid part can pay the rest)
export const amountDue = (price: number, confirmed: number[]) =>
  Math.max(0, price - confirmed.reduce((sum, amount) => sum + amount, 0));

// The Paybill account number: the order's number alone ("1048"), easy to type on any phone.
// The order number belongs to that order forever and is never given to another.
export const accountNumber = (orderNumber: number) => String(orderNumber);

// ---------- The prompt (STK Push) ----------

// How long the client has to enter their PIN before M-Pesa gives up
export const PROMPT_SECONDS = 60;

// What happened to a prompt, as the client is told
export const PROMPT_RESULT = {
  paid: "Payment received",
  cancelled: "You cancelled the M-Pesa prompt. No money was taken.",
  noFunds: "Not enough money in your M-Pesa account. No money was taken.",
  timeout: "You didn't enter your PIN in time. No money was taken.",
  failed: "M-Pesa couldn't complete the payment. No money was taken.",
} as const;
export type PromptOutcome = keyof typeof PROMPT_RESULT;

// The pretend phone (no Safaricom keys yet): the tester picks what the client does
export const PRETEND_OUTCOMES = ["paid", "cancelled", "noFunds", "timeout"] as const satisfies readonly PromptOutcome[];
export type PretendOutcome = (typeof PRETEND_OUTCOMES)[number];

// A pretend M-Pesa code: 10 capital letters and numbers like a real one, starting "PRT" so it's
// never mistaken for a real payment
export function pretendReceipt(random: () => number = Math.random): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return `PRT${Array.from({ length: 7 }, () => chars[Math.floor(random() * chars.length)]).join("")}`;
}
