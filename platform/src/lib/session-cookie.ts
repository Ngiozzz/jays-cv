import { createHmac } from "node:crypto";

// Better Auth's session cookie value: "<token>.<HMAC-SHA256 signature>" (URL-encoded when written).
// Used where we start a session ourselves (test sign-in, browser tests) instead of through Google.
export const SESSION_COOKIE = "better-auth.session_token";

export function signedSessionValue(token: string, secret: string): string {
  const signature = createHmac("sha256", secret).update(token).digest("base64");
  return `${token}.${signature}`;
}
