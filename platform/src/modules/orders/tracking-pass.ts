import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

// After a client proves an order is theirs (tracking link, or order number + phone), their browser
// keeps a signed pass for that one order, so they aren't asked again. It can't be forged or moved
// to another order without the server's secret. A "Check it yourself" CV check gets the same kind
// of pass, so only the browser that paid for it can read its feedback.

const DAYS = 30;
type PassKind = "track" | "check";
const cookieName = (kind: PassKind, id: string) => `jc_${kind}_${id}`;

const sign = (kind: PassKind, tenantId: string, id: string, expires: number) =>
  createHmac("sha256", env.BETTER_AUTH_SECRET).update(`${kind}:${tenantId}:${id}:${expires}`).digest("base64url");

function passCookie(kind: PassKind, tenantId: string, id: string) {
  const expires = Date.now() + DAYS * 24 * 3_600_000;
  return {
    name: cookieName(kind, id),
    value: `${expires}.${sign(kind, tenantId, id, expires)}`,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: DAYS * 24 * 3600,
  };
}

async function hasPass(kind: PassKind, tenantId: string, id: string): Promise<boolean> {
  const value = (await cookies()).get(cookieName(kind, id))?.value;
  const [expiresText, signature] = value?.split(".") ?? [];
  const expires = Number(expiresText);
  if (!signature || !Number.isFinite(expires) || expires < Date.now()) return false;
  const expected = Buffer.from(sign(kind, tenantId, id, expires));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

// The pass as a cookie: set by a server action, or put straight on a route handler's response
export const trackingPassCookie = (tenantId: string, orderId: string) => passCookie("track", tenantId, orderId);

export async function grantTrackingPass(tenantId: string, orderId: string) {
  (await cookies()).set(trackingPassCookie(tenantId, orderId));
}

export const hasTrackingPass = (tenantId: string, orderId: string) => hasPass("track", tenantId, orderId);

export async function grantCheckPass(tenantId: string, checkId: string) {
  (await cookies()).set(passCookie("check", tenantId, checkId));
}

export const hasCheckPass = (tenantId: string, checkId: string) => hasPass("check", tenantId, checkId);
