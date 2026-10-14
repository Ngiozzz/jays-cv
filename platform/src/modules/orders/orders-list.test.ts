import { describe, expect, it } from "vitest";
import {
  countTabs,
  filterOrders,
  filtersHref,
  parseOrderFilters,
  quickCounts,
  type ListOrder,
  type OrderFilters,
} from "./orders-list";
import { HOUR } from "./orders.rules";

const now = new Date("2026-10-14T12:00:00Z");
const hoursAgo = (hours: number) => new Date(now.getTime() - hours * HOUR);
const inHours = (hours: number) => new Date(now.getTime() + hours * HOUR);

const row = (ref: string, patch: Partial<ListOrder> = {}): ListOrder => ({
  id: ref,
  ref,
  status: "WRITING",
  itemName: "Professional CV",
  packageName: "Professional",
  amount: 3500,
  clientName: `Client ${ref}`,
  clientPhone: "0712 345 678",
  writerId: "grace",
  writerName: "Grace",
  paid: true,
  payChannel: "M-Pesa prompt",
  receipt: null,
  createdAt: hoursAgo(10),
  paidAt: hoursAgo(9),
  deliveredAt: null,
  due: { text: "", tone: "" },
  deadline: inHours(15),
  ...patch,
});

const orders = [
  row("JC-1", { status: "NEW", writerId: null, writerName: null, paid: false, paidAt: null, deadline: null }),
  row("JC-2", { status: "PAID", writerId: null, writerName: null, deadline: inHours(20), createdAt: hoursAgo(2) }),
  row("JC-3", { status: "WRITING", writerId: "me", writerName: "Me", deadline: inHours(-2), createdAt: hoursAgo(30) }),
  row("JC-4", { status: "DRAFT_SENT", deadline: null, itemName: "Cover letter", packageName: null, amount: 800 }),
  row("JC-5", { status: "ABANDONED", writerId: null, paid: false, paidAt: null, deadline: null }),
  row("JC-6", { status: "DELIVERED", deadline: null, paidAt: new Date("2026-09-20T10:00:00Z"), amount: 6000 }),
];

const filters = (patch: Partial<OrderFilters> = {}): OrderFilters => ({
  ...parseOrderFilters({}, true),
  ...patch,
});
const refs = (list: ListOrder[]) => list.map((order) => order.ref);

describe("parseOrderFilters", () => {
  it("ignores unknown values and keeps money filters from writers", () => {
    const parsed = parseOrderFilters({ status: "nope", quick: "paid", sort: "amount", pay: "paid" }, false);
    expect(parsed).toMatchObject({ tab: "all", quick: "", sort: "newest", pay: "paid" });
    expect(parseOrderFilters({ quick: "paid", sort: "amount" }, true)).toMatchObject({ quick: "paid", sort: "amount" });
  });

  it("round-trips through the address bar", () => {
    const view = filters({ tab: "open", q: "wanjiku", sort: "due" });
    expect(filtersHref(view)).toBe("/admin/orders?status=open&q=wanjiku&sort=due");
    expect(filtersHref(filters())).toBe("/admin/orders");
  });
});

describe("filterOrders", () => {
  it("hides abandoned orders from All and counts each tab", () => {
    expect(refs(filterOrders(orders, filters(), "me", now))).toEqual(["JC-2", "JC-1", "JC-4", "JC-6", "JC-3"]);
    expect(countTabs(orders, "me")).toMatchObject({ all: 5, new: 2, open: 1, mine: 1, delivered: 1 });
  });

  it("finds orders that need action: unpaid, not accepted, and late", () => {
    expect(refs(filterOrders(orders, filters({ quick: "action", sort: "oldest" }), "me", now))).toEqual([
      "JC-3",
      "JC-1",
      "JC-2",
    ]);
  });

  it("filters by package, writer, due time and search", () => {
    expect(refs(filterOrders(orders, filters({ pkg: "single" }), "me", now))).toEqual(["JC-4"]);
    expect(refs(filterOrders(orders, filters({ writer: "open" }), "me", now))).toEqual(["JC-2"]);
    expect(refs(filterOrders(orders, filters({ due: "overdue" }), "me", now))).toEqual(["JC-3"]);
    expect(refs(filterOrders(orders, filters({ q: "client jc-4" }), "me", now))).toEqual(["JC-4"]);
    expect(refs(filterOrders(orders, filters({ q: "345678", tab: "open" }), "me", now))).toEqual(["JC-2"]);
  });

  it("can't find an order by a phone number the viewer can't see", () => {
    const hidden = orders.map((order) => ({ ...order, clientPhone: null }));
    expect(filterOrders(hidden, filters({ q: "0712345678" }), "me", now)).toEqual([]);
  });

  it("sorts by the nearest deadline", () => {
    expect(refs(filterOrders(orders, filters({ sort: "due", tab: "all" }), "me", now)).slice(0, 2)).toEqual([
      "JC-3",
      "JC-2",
    ]);
  });
});

describe("quickCounts", () => {
  it("counts the cards and this month's takings", () => {
    expect(quickCounts(orders, now)).toEqual({ action: 3, writing: 1, due24: 2, paidAmount: 3500 * 2 + 800 });
  });
});
