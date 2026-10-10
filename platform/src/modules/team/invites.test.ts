import { describe, expect, it } from "vitest";
import { inviteExpiry, isUsableInvite, normalizeEmail } from "./invites";

const now = new Date("2026-10-10T12:00:00Z");

describe("normalizeEmail", () => {
  it("lower-cases and trims", () => {
    expect(normalizeEmail("  Grace.W@Gmail.COM ")).toBe("grace.w@gmail.com");
  });
});

describe("isUsableInvite", () => {
  it("accepts a pending invite before it expires", () => {
    expect(isUsableInvite({ status: "PENDING", expiresAt: inviteExpiry(now) }, now)).toBe(true);
  });

  it("rejects expired, revoked and already-used invites", () => {
    expect(isUsableInvite({ status: "PENDING", expiresAt: new Date(now.getTime() - 1) }, now)).toBe(false);
    expect(isUsableInvite({ status: "REVOKED", expiresAt: inviteExpiry(now) }, now)).toBe(false);
    expect(isUsableInvite({ status: "ACCEPTED", expiresAt: inviteExpiry(now) }, now)).toBe(false);
  });
});
