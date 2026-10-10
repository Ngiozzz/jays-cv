import { describe, expect, it } from "vitest";
import { displayPhone, whatsappDigits, whatsappLink } from "./contact";

describe("whatsappDigits", () => {
  it("turns local numbers into international ones", () => {
    expect(whatsappDigits("0725 912 186")).toBe("254725912186");
    expect(whatsappDigits("+254 725 912 186")).toBe("254725912186");
  });
});

describe("whatsappLink", () => {
  it("encodes the message", () => {
    expect(whatsappLink("0725912186", "Hi Jay CVS, I'd like help")).toBe(
      "https://wa.me/254725912186?text=Hi%20Jay%20CVS%2C%20I'd%20like%20help",
    );
    expect(whatsappLink("0725912186")).toBe("https://wa.me/254725912186");
  });
});

describe("displayPhone", () => {
  it("formats for reading", () => {
    expect(displayPhone("0725 912 186")).toBe("(+254) 725 912 186");
  });
});
