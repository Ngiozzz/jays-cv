import { describe, expect, it } from "vitest";
import { displayNameOf, profileSchema, splitName } from "./profile";

const grace = { firstName: "Grace", lastName: "Wanjiku", nickname: "", phone: "" };

describe("profileSchema", () => {
  it("tidies the names and phone number", () => {
    expect(
      profileSchema.parse({ firstName: " Grace ", lastName: " Wanjiku ", nickname: " Gee ", phone: "0712 345 678" }),
    ).toEqual({ firstName: "Grace", lastName: "Wanjiku", nickname: "Gee", phone: "0712345678" });
  });

  it("allows no nickname or phone, but not a wrong phone or a missing name", () => {
    expect(profileSchema.safeParse(grace).success).toBe(true);
    expect(profileSchema.safeParse({ ...grace, phone: "12345" }).success).toBe(false);
    expect(profileSchema.safeParse({ ...grace, firstName: " " }).success).toBe(false);
    expect(profileSchema.safeParse({ ...grace, lastName: "" }).success).toBe(false);
  });
});

describe("displayNameOf", () => {
  it("uses the nickname when there is one, otherwise the full name", () => {
    expect(displayNameOf({ ...grace, nickname: "Gee" })).toBe("Gee");
    expect(displayNameOf(grace)).toBe("Grace Wanjiku");
  });
});

describe("splitName", () => {
  it("takes the first word as the first name and the rest as the last name", () => {
    expect(splitName("Grace Wanjiku Kamau")).toEqual({ firstName: "Grace", lastName: "Wanjiku Kamau" });
    expect(splitName("Grace")).toEqual({ firstName: "Grace", lastName: "" });
  });
});
