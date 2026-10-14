import { describe, expect, it } from "vitest";
import type { ListOrder } from "@/modules/orders/orders-list";
import { DAY, HOUR } from "@/modules/orders/orders.rules";
import {
  greeting,
  jobSummary,
  myCvs,
  openOrders,
  ordersNeedingAttention,
  progressRows,
  stageOf,
  waitingFor,
  type DashboardJob,
} from "./dashboard";

const now = new Date("2026-10-14T09:00:00Z"); // 12:00 in Nairobi
const hoursAgo = (hours: number) => new Date(now.getTime() - hours * HOUR);
const inHours = (hours: number) => new Date(now.getTime() + hours * HOUR);

const row = (ref: string, patch: Partial<ListOrder> = {}): ListOrder => ({
  id: ref,
  ref,
  status: "WRITING",
  itemName: "Professional CV",
  packageName: "Professional",
  amount: null,
  clientName: `Client ${ref}`,
  clientPhone: null,
  writerId: "grace",
  writerName: "Grace",
  paid: true,
  payChannel: null,
  receipt: null,
  createdAt: hoursAgo(10),
  paidAt: hoursAgo(9),
  deliveredAt: null,
  due: { text: "", tone: "" },
  deadline: inHours(15),
  ...patch,
});

const open = (ref: string, waited: number) =>
  row(ref, { status: "PAID", writerId: null, writerName: null, paidAt: hoursAgo(waited), deadline: inHours(40) });

describe("CV progress", () => {
  it("counts delivered CVs for 30 days only, and nothing that isn't being worked on", () => {
    expect(stageOf(row("a", { status: "DELIVERED", deliveredAt: new Date(now.getTime() - 29 * DAY) }), now)).toBe(
      "DELIVERED",
    );
    expect(stageOf(row("b", { status: "DELIVERED", deliveredAt: new Date(now.getTime() - 31 * DAY) }), now)).toBeNull();
    expect(stageOf(row("c", { status: "NEW" }), now)).toBeNull();
    expect(stageOf(row("d", { status: "PAID" }), now)).toBeNull();
    expect(stageOf(row("e", { status: "REVISIONS" }), now)).toBe("REVISIONS");
  });

  it("gives each person a row of their own CVs by stage, even when they have none", () => {
    const orders = [
      row("JC-1"),
      row("JC-2", { status: "DRAFT_SENT" }),
      row("JC-3", { writerId: "tom", writerName: "Tom" }),
      open("JC-4", 2),
    ];
    const rows = progressRows(
      orders,
      [
        { id: "grace", name: "Grace" },
        { id: "tom", name: "Tom" },
        { id: "amina", name: "Amina" },
      ],
      now,
    );
    expect(rows.map((r) => [r.name, r.total])).toEqual([
      ["Grace", 2],
      ["Tom", 1],
      ["Amina", 0],
    ]);
    expect(rows[0].stages.find((s) => s.key === "DRAFT_SENT")?.refs).toEqual(["JC-2"]);
  });

  it("lists the viewer's own CVs in progress, most urgent first", () => {
    const orders = [
      row("later", { deadline: inHours(30) }),
      row("sooner", { status: "REVISIONS", deadline: inHours(2) }),
      row("with-client", { status: "DRAFT_SENT", deadline: null }),
      row("done", { status: "DELIVERED", deliveredAt: hoursAgo(1) }),
      row("someone-else", { writerId: "tom" }),
    ];
    expect(myCvs(orders, "grace").map((o) => o.ref)).toEqual(["sooner", "later", "with-client"]);
  });
});

describe("orders", () => {
  it("lists paid orders nobody has accepted, longest waiting first, with how long", () => {
    const orders = [open("new", 1), row("taken"), open("old", 26)];
    expect(openOrders(orders).map((o) => o.ref)).toEqual(["old", "new"]);
    expect(waitingFor(openOrders(orders)[0], now)).toBe("1d 2h");
  });

  it("puts not-accepted orders first, then the nearest deadline, and leaves out the rest", () => {
    const orders = [
      row("late", { deadline: hoursAgo(1) }),
      row("revisions", { status: "REVISIONS", deadline: inHours(5) }),
      open("open", 3),
      row("fine", { deadline: inHours(20) }),
      row("abandoned", { status: "ABANDONED", paid: false, paidAt: null, deadline: null }),
    ];
    expect(ordersNeedingAttention(orders, now).map((o) => o.ref)).toEqual(["open", "late", "revisions"]);
    expect(ordersNeedingAttention(orders, now, 1)).toHaveLength(1);
  });
});

describe("jobs", () => {
  const job = (id: string, patch: Partial<DashboardJob> = {}): DashboardJob => ({
    id,
    shownAs: "published",
    deadline: null,
    postedDay: "2026-10-10",
    ...patch,
  });

  it("counts the jobs and lists those closing within 7 days, soonest first", () => {
    const summary = jobSummary(
      [
        job("open-ended"),
        job("in-8-days", { deadline: "2026-10-22" }),
        job("in-7-days", { deadline: "2026-10-21" }),
        job("today", { deadline: "2026-10-14" }),
        job("draft", { shownAs: "draft", deadline: "2026-10-15" }),
        job("gone", { shownAs: "expired", deadline: "2026-10-01" }),
      ],
      "2026-10-14",
    );
    expect(summary).toMatchObject({ live: 4, closingSoon: 2, drafts: 1, expired: 1 });
    expect(summary.closingList.map((j) => j.id)).toEqual(["today", "in-7-days"]);
  });

  it("shows the most recently posted first", () => {
    const summary = jobSummary(
      [job("old", { postedDay: "2026-09-01" }), job("new", { postedDay: "2026-10-13" })],
      "2026-10-14",
    );
    expect(summary.recent.map((j) => j.id)).toEqual(["new", "old"]);
  });
});

describe("greeting", () => {
  it("follows the time in Nairobi", () => {
    expect(greeting(new Date("2026-10-14T05:00:00Z"))).toBe("Good morning"); // 08:00
    expect(greeting(now)).toBe("Good afternoon"); // 12:00
    expect(greeting(new Date("2026-10-14T15:30:00Z"))).toBe("Good evening"); // 18:30
  });
});
