// The rules for messages between the Command Center and this platform.
// Kept free of app imports so the same file can be copied into the Command Center repo.
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const PROTOCOL_VERSION = "v1";

export const CC_HEADERS = {
  business: "x-cc-business",
  timestamp: "x-cc-timestamp",
  signature: "x-cc-signature",
} as const;

// Messages older (or further in the future) than this are refused, so a copied message can't be replayed later
export const MAX_AGE_MS = 5 * 60 * 1000;

export type SignedParts = {
  method: string;
  // path plus query, e.g. "/api/command-center/v1/usage?after=10"
  pathWithQuery: string;
  business: string;
  body: string;
  timestamp: number;
};

export function sha256Hex(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

// The exact text that gets signed: any change to method, path, business, time or body breaks the signature
export function stringToSign(parts: SignedParts): string {
  return [
    PROTOCOL_VERSION,
    String(parts.timestamp),
    parts.method.toUpperCase(),
    parts.pathWithQuery,
    parts.business,
    sha256Hex(parts.body),
  ].join("\n");
}

export function sign(key: string, parts: SignedParts): string {
  return createHmac("sha256", key).update(stringToSign(parts), "utf8").digest("base64url");
}

// Headers the sender attaches to a request
export function signedHeaders(
  key: string,
  parts: Omit<SignedParts, "timestamp">,
  now: number = Date.now(),
): Record<string, string> {
  return {
    [CC_HEADERS.business]: parts.business,
    [CC_HEADERS.timestamp]: String(now),
    [CC_HEADERS.signature]: sign(key, { ...parts, timestamp: now }),
  };
}

export type VerifyResult =
  { ok: true; business: string } | { ok: false; reason: "missing" | "stale" | "bad_signature" };

export type IncomingRequest = {
  method: string;
  pathWithQuery: string;
  body: string;
  header: (name: string) => string | null;
};

// The receiver checks a request. getKey returns the business's secret key, or null for an unknown business.
export async function verify(
  req: IncomingRequest,
  getKey: (business: string) => Promise<string | null>,
  now: number = Date.now(),
): Promise<VerifyResult> {
  const business = req.header(CC_HEADERS.business);
  const timestampText = req.header(CC_HEADERS.timestamp);
  const signature = req.header(CC_HEADERS.signature);
  if (!business || !timestampText || !signature) return { ok: false, reason: "missing" };

  const timestamp = Number(timestampText);
  if (!/^\d+$/.test(timestampText) || Math.abs(now - timestamp) > MAX_AGE_MS) {
    return { ok: false, reason: "stale" };
  }

  const key = await getKey(business);
  // An unknown business gets the same answer as a wrong signature, so nobody can probe which businesses exist
  if (!key) return { ok: false, reason: "bad_signature" };

  const expected = Buffer.from(
    sign(key, { method: req.method, pathWithQuery: req.pathWithQuery, business, body: req.body, timestamp }),
  );
  const given = Buffer.from(signature);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return { ok: false, reason: "bad_signature" };
  }
  return { ok: true, business };
}
