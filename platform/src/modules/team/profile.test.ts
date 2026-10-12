import { describe, expect, it } from "vitest";
import { profileSchema } from "./profile";

describe("profileSchema", () => {
  it("tidies the phone number and keeps the name", () => {
    expect(profileSchema.parse({ displayName: " Grace W ", phone: "0712 345 678" })).toEqual({
      displayName: "Grace W",
      phone: "0712345678",
    });
  });

  it("allows no phone, but not a wrong one", () => {
    expect(profileSchema.safeParse({ displayName: "Grace", phone: "" }).success).toBe(true);
    expect(profileSchema.safeParse({ displayName: "Grace", phone: "12345" }).success).toBe(false);
    expect(profileSchema.safeParse({ displayName: "G", phone: "" }).success).toBe(false);
  });
});
