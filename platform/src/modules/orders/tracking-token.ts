import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

// Node-only (crypto), so it can never end up in the browser. Also used by the test-order script.
// Each order's private tracking link carries a random code. Only its hash is stored, so a
// database leak can't reveal anyone's link; the link itself is shown once and sent to the client.

// Letters and digits that can't be mixed up when read aloud or typed (no 0/o, 1/l/i)
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
const LENGTH = 22; // ≈ 109 bits: impossible to guess

export function newTrackingToken(): string {
  // Rejection sampling keeps every character equally likely
  const out: string[] = [];
  while (out.length < LENGTH) {
    for (const byte of randomBytes(LENGTH * 2)) {
      if (byte < 248 && out.length < LENGTH) out.push(ALPHABET[byte % ALPHABET.length]);
    }
  }
  return out.join("");
}

export const hashTrackingToken = (token: string) => createHash("sha256").update(token).digest("hex");

export const looksLikeTrackingToken = (token: string) =>
  token.length === LENGTH && [...token].every((char) => ALPHABET.includes(char));

// Encrypted copy for staff to resend the link (AES-256-GCM; the key comes from the server's secret)
const keyOf = (secret: string) => createHash("sha256").update(`tracking-link:${secret}`).digest();

export function sealTrackingToken(token: string, secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyOf(secret), iv);
  const sealed = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), sealed].map((part) => part.toString("base64url")).join(".");
}

export function openTrackingToken(sealed: string, secret: string): string | null {
  try {
    const [iv, tag, data] = sealed.split(".").map((part) => Buffer.from(part, "base64url"));
    const decipher = createDecipheriv("aes-256-gcm", keyOf(secret), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
