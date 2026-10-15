import { describe, expect, it } from "vitest";
import { deliveredOrderBy, deliveredWhere, pageCount, parsePage, storedPhonePart, type Viewer } from "./orders-history";
import { parseOrderFilters } from "./orders-list";

const owner: Viewer = { memberId: "m-owner", orderPrefix: "JC", money: true, allPhones: true };
const writer: Viewer = { memberId: "m-writer", orderPrefix: "JC", money: false, allPhones: false };
const now = new Date("2026-10-15T09:00:00Z");
const filters = (params: Record<string, string>, money = true) => parseOrderFilters(params, money);

describe("deliveredWhere", () => {
  it("leaves delivered orders out of views they can never appear in", () => {
    expect(deliveredWhere(filters({ status: "writing" }), owner, now)).toBeNull();
    expect(deliveredWhere(filters({ quick: "due24" }), owner, now)).toBeNull();
    expect(deliveredWhere(filters({ due: "overdue" }), owner, now)).toBeNull();
    expect(deliveredWhere(filters({ writer: "open" }), owner, now)).toBeNull();
  });

  it("narrows to the viewer's own orders on My orders", () => {
    expect(deliveredWhere(filters({ status: "mine" }), writer, now)).toEqual({
      AND: [{ status: "DELIVERED" }, { writerId: "m-writer" }],
    });
  });

  it("filters by package, single services and payments this month", () => {
    expect(deliveredWhere(filters({ pkg: "Professional", quick: "paid" }), owner, now)).toEqual({
      AND: [
        { status: "DELIVERED" },
        { package: { shortName: "Professional" } },
        { paidAt: { gte: new Date(2026, 9, 1) } },
      ],
    });
    expect(deliveredWhere(filters({ pkg: "single" }), owner, now)).toEqual({
      AND: [{ status: "DELIVERED" }, { packageId: null }],
    });
  });

  it("searches names, the order number, M-Pesa codes and phone numbers", () => {
    const where = deliveredWhere(filters({ q: "JC-1048" }), owner, now);
    expect(JSON.stringify(where)).toContain('{"number":1048}');
    const phone = JSON.stringify(deliveredWhere(filters({ q: "0712345678" }), owner, now));
    expect(phone).toContain('"contains":"0712 345 678"');
    expect(phone).toContain('"receipt"');
  });

  it("lets a writer find phone numbers only on their own orders, and never M-Pesa codes", () => {
    const where = JSON.stringify(deliveredWhere(filters({ q: "0712345678" }, false), writer, now));
    expect(where).toContain('"writerId":"m-writer"');
    expect(where).not.toContain("receipt");
  });
});

describe("paging", () => {
  it("formats typed phone numbers the way they're stored", () => {
    expect(storedPhonePart("254712345678")).toBe("0712 345 678");
    expect(storedPhonePart("0712345")).toBe("0712 345");
    expect(storedPhonePart("5678")).toBe("5678");
  });

  it("sorts delivered orders without a deadline newest first", () => {
    expect(deliveredOrderBy("due")).toEqual({ createdAt: "desc" });
    expect(deliveredOrderBy("amount")).toEqual({ amount: "desc" });
  });

  it("counts pages and reads the page number safely", () => {
    expect(pageCount(0)).toBe(1);
    expect(pageCount(101)).toBe(3);
    expect(parsePage("3")).toBe(3);
    expect([parsePage("-2"), parsePage("abc"), parsePage(undefined)]).toEqual([1, 1, 1]);
  });
});
