import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

// After a client proves an order is theirs (tracking link, or order number + phone), their browser
// keeps a signed pass for that one order, so they aren't asked again. It can't be forged or moved
// to another order without the server's secret.

const DAYS = 30;
const cookieName = (orderId: string) => `jc_track_${orderId}`;

const sign = (tenantId: string, orderId: string, expires: number) =>
  createHmac("sha256", env.BETTER_AUTH_SECRET).update(`track:${tenantId}:${orderId}:${expires}`).digest("base64url");

// The pass as a cookie: set by a server action, or put straight on a route handler's response
export function trackingPassCookie(tenantId: string, orderId: string) {
  const expires = Date.now() + DAYS * 24 * 3_600_000;
  return {
    name: cookieName(orderId),
    value: `${expires}.${sign(tenantId, orderId, expires)}`,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: DAYS * 24 * 3600,
  };
}

export async function grantTrackingPass(tenantId: string, orderId: string) {
  (await cookies()).set(trackingPassCookie(tenantId, orderId));
}

export async function hasTrackingPass(tenantId: string, orderId: string): Promise<boolean> {
  const value = (await cookies()).get(cookieName(orderId))?.value;
  const [expiresText, signature] = value?.split(".") ?? [];
  const expires = Number(expiresText);
  if (!signature || !Number.isFinite(expires) || expires < Date.now()) return false;
  const expected = Buffer.from(sign(tenantId, orderId, expires));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
