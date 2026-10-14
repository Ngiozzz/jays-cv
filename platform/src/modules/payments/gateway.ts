import "server-only";
import { randomBytes } from "node:crypto";

// The connection to M-Pesa. Until the business has Safaricom Daraja keys, the website uses a pretend
// M-Pesa in development: no prompt reaches a phone, and the tester chooses on screen what the client
// does (entered PIN, cancelled, …). The real Daraja connection will implement the same shape, so nothing else
// changes when the keys arrive.

export type PromptRequest = {
  // "2547XXXXXXXX"
  phone: string;
  amount: number;
  // What the client sees as the account number on the prompt: the order's number
  account: string;
  description: string;
};

export type PromptSent =
  { ok: true; checkoutRequestId: string; merchantRequestId: string } | { ok: false; error: string };

export type MpesaGateway = {
  // true: the pretend M-Pesa (the pay box shows the tester's buttons)
  pretend: boolean;
  sendPrompt(request: PromptRequest): Promise<PromptSent>;
};

const pretendGateway: MpesaGateway = {
  pretend: true,
  async sendPrompt() {
    const id = randomBytes(8).toString("hex");
    return { ok: true, checkoutRequestId: `pretend_${id}`, merchantRequestId: `pretend_${id}` };
  },
};

// The live site never pretends: anyone could "pay" with the test buttons. Without Daraja keys
// there, the prompt is simply unavailable and clients use the Paybill.
const unavailableGateway: MpesaGateway = {
  pretend: false,
  async sendPrompt() {
    return { ok: false, error: "The M-Pesa prompt isn't available right now. Please pay via Paybill." };
  },
};

export const mpesa: MpesaGateway = process.env.NODE_ENV === "production" ? unavailableGateway : pretendGateway;
