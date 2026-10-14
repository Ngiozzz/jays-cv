import { describe, expect, it } from "vitest";
import { clientActor, clientEventText, type ClientEvent } from "./order-events";
import { greetingName, isLocked, parseOrderNumber, samePhone, STEP_OF, TRY_LIMITS } from "./tracking";

describe("parseOrderNumber", () => {
  it("reads the order number however the client types it", () => {
    for (const typed of ["JC-1048", "jc 1048", "JC1048", " 1048 ", "jc - 1048"])
      expect(parseOrderNumber(typed, "JC")).toBe(1048);
  });

  it("refuses other businesses' prefixes and junk", () => {
    expect(parseOrderNumber("AB-1048", "JC")).toBeNull();
    expect(parseOrderNumber("JC-10x8", "JC")).toBeNull();
    expect(parseOrderNumber("", "JC")).toBeNull();
  });
});

describe("samePhone", () => {
  it("matches the same Kenyan number written differently", () => {
    expect(samePhone("0712 345 678", "+254712345678")).toBe(true);
    expect(samePhone("254-712-345-678", "0712345678")).toBe(true);
  });

  it("refuses a different or partial number", () => {
    expect(samePhone("0712 345 679", "0712345678")).toBe(false);
    expect(samePhone("5678", "0712345678")).toBe(false);
  });
});

describe("tracking limits and wording", () => {
  it("locks an order after too many wrong tries", () => {
    expect(isLocked(4, TRY_LIMITS.perOrder)).toBe(false);
    expect(isLocked(5, TRY_LIMITS.perOrder)).toBe(true);
  });

  it("shows changes being made as writing again", () => {
    expect(STEP_OF.REVISIONS).toBe(STEP_OF.WRITING);
    expect(STEP_OF.DRAFT_SENT).toBeGreaterThan(STEP_OF.WRITING);
  });

  it("greets the client by first name", () => {
    expect(greetingName("Dr. Amina Wanjiru")).toBe("Amina");
    expect(greetingName("Brian")).toBe("Brian");
  });

  it("words events for the client and never shows staff-only ones", () => {
    const event = (kind: string, data: unknown = null): ClientEvent => ({
      kind,
      actorType: "STAFF",
      actorName: "Grace Mwangi",
      data,
      at: new Date(),
    });
    expect(clientActor(event("accepted"), "Jay CVS")).toBe("Grace");
    expect(clientActor({ ...event("placed"), actorType: "CLIENT" }, "Jay CVS")).toBe("You");
    expect(clientEventText(event("paid", { receipt: "SJK4H7XQ2P", amount: 3500 }))).toBe(
      "Payment received (M-Pesa code SJK4H7XQ2P)",
    );
    expect(clientEventText(event("draftSent", { version: "v2" }))).toBe("Sent you draft v2");
    expect(clientEventText(event("note", { text: "Client sounds stressed" }))).toBeNull();
  });
});
