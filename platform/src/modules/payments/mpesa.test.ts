import { describe, expect, it } from "vitest";
import { accountNumber, amountDue, localPhone, mpesaPhone, pretendReceipt } from "./mpesa";

describe("M-Pesa phone numbers", () => {
  it("reads a Kenyan mobile number however it's typed", () => {
    for (const typed of ["0712 345 678", "0712345678", "+254 712-345-678", "254712345678", "712345678"])
      expect(mpesaPhone(typed)).toBe("254712345678");
    expect(mpesaPhone("0110 123 456")).toBe("254110123456");
  });

  it("refuses anything that isn't one", () => {
    for (const typed of ["", "0712 345", "0812 345 678", "+1 415 555 0100", "07123456789", "abc"])
      expect(mpesaPhone(typed)).toBeNull();
  });

  it("shows the number back the way Kenyans write it", () => {
    expect(localPhone("254712345678")).toBe("0712 345 678");
  });
});

describe("what's still to pay", () => {
  it("adds up every confirmed payment", () => {
    expect(amountDue(3000, [])).toBe(3000);
    expect(amountDue(3000, [1500])).toBe(1500);
    expect(amountDue(3000, [1500, 1500])).toBe(0);
    expect(amountDue(3000, [3500])).toBe(0);
  });
});

describe("the Paybill account number", () => {
  it("is the order's number alone", () => {
    expect(accountNumber(1048)).toBe("1048");
  });
});

describe("pretend M-Pesa codes", () => {
  it("look like real ones but start with PRT", () => {
    const code = pretendReceipt();
    expect(code).toMatch(/^PRT[A-Z0-9]{7}$/);
    expect(code).toHaveLength(10);
  });
});
