import type { OrderStatus } from "@/generated/prisma/enums";
import { HOUR } from "./orders.rules";

// Admin → Orders list: tabs, the quick-filter cards, the filter dropdowns, search and sort.
// Pure: rows are built by the service (with each viewer's privacy rules already applied).

export type ListOrder = {
  id: string;
  ref: string;
  status: OrderStatus;
  itemName: string;
  // The package's short name ("Professional"), or null for a single service
  packageName: string | null;
  // null when this viewer may not see money
  amount: number | null;
  clientName: string;
  // null when this viewer may not see the client's contact details
  clientPhone: string | null;
  writerId: string | null;
  writerName: string | null;
  paid: boolean;
  payChannel: string | null;
  // M-Pesa code: owner only
  receipt: string | null;
  createdAt: Date;
  paidAt: Date | null;
  deliveredAt: Date | null;
  due: { text: string; tone: string };
  // The deadline the team is working to (null: none running)
  deadline: Date | null;
};

export const TABS = [
  { key: "all", label: "All" },
  { key: "new", label: "Awaiting payment" },
  { key: "open", label: "⚠ Not accepted" },
  { key: "writing", label: "Writing" },
  { key: "draft", label: "Draft sent" },
  { key: "revisions", label: "Revisions" },
  { key: "delivered", label: "Delivered" },
  { key: "mine", label: "My orders" },
] as const;
export type TabKey = (typeof TABS)[number]["key"];

export const QUICK = {
  action: "Need action",
  writing: "Being written",
  due24: "Due within 24h",
  paid: "Paid this month",
} as const;
export type QuickKey = keyof typeof QUICK;

export const FILTER_OPTIONS = {
  pay: { paid: "Paid", unpaid: "Not paid yet" },
  due: {
    overdue: "Overdue",
    "6h": "Due within 6h",
    "24h": "Due within 24h",
    client: "With client (waiting for reply)",
  },
  placed: { today: "Today", "7d": "Last 7 days", "30d": "Last 30 days" },
} as const;

export const SORTS = {
  newest: "Newest first",
  oldest: "Oldest first",
  due: "Due soonest",
  amount: "Highest amount",
} as const;
export type SortKey = keyof typeof SORTS;

export type OrderFilters = {
  tab: TabKey;
  quick: QuickKey | "";
  // A package's short name, "single" for single services, or ""
  pkg: string;
  // A member id, "open", "mine", or ""
  writer: string;
  pay: keyof typeof FILTER_OPTIONS.pay | "";
  due: keyof typeof FILTER_OPTIONS.due | "";
  placed: keyof typeof FILTER_OPTIONS.placed | "";
  sort: SortKey;
  q: string;
};

type Params = Record<string, string | string[] | undefined>;
const one = (params: Params, name: string) => {
  const value = params[name];
  return typeof value === "string" ? value.trim() : "";
};
const pick = <T extends string>(value: string, allowed: readonly T[], fallback: T | ""): T | "" =>
  (allowed as readonly string[]).includes(value) ? (value as T) : fallback;

// Reads the filters from the address bar (so a view can be bookmarked or shared). Writers can't
// filter or sort by money.
export function parseOrderFilters(params: Params, seesMoney: boolean): OrderFilters {
  const sorts = Object.keys(SORTS).filter((key) => seesMoney || key !== "amount") as SortKey[];
  const quicks = Object.keys(QUICK).filter((key) => seesMoney || key !== "paid") as QuickKey[];
  return {
    tab: (pick(
      one(params, "status"),
      TABS.map((tab) => tab.key),
      "all",
    ) || "all") as TabKey,
    quick: pick(one(params, "quick"), quicks, ""),
    pkg: one(params, "pkg").slice(0, 40),
    writer: one(params, "writer").slice(0, 40),
    pay: pick(one(params, "pay"), Object.keys(FILTER_OPTIONS.pay) as (keyof typeof FILTER_OPTIONS.pay)[], ""),
    due: pick(one(params, "due"), Object.keys(FILTER_OPTIONS.due) as (keyof typeof FILTER_OPTIONS.due)[], ""),
    placed: pick(
      one(params, "placed"),
      Object.keys(FILTER_OPTIONS.placed) as (keyof typeof FILTER_OPTIONS.placed)[],
      "",
    ),
    sort: (pick(one(params, "sort"), sorts, "newest") || "newest") as SortKey,
    q: one(params, "q").slice(0, 60),
  };
}

// The address for a view: only what differs from the defaults
export function filtersHref(filters: OrderFilters, change: Partial<OrderFilters> = {}): string {
  const next = { ...filters, ...change };
  const params = new URLSearchParams();
  if (next.tab !== "all") params.set("status", next.tab);
  for (const name of ["quick", "pkg", "writer", "pay", "due", "placed", "q"] as const)
    if (next[name]) params.set(name, next[name]);
  if (next.sort !== "newest") params.set("sort", next.sort);
  const search = params.toString();
  return search ? `/admin/orders?${search}` : "/admin/orders";
}

// ---------- Matching ----------

const isOpen = (order: ListOrder) => order.status === "PAID" && !order.writerId;
const timeLeft = (order: ListOrder, now: Date) =>
  order.deadline ? order.deadline.getTime() - now.getTime() : Number.POSITIVE_INFINITY;

export function matchesTab(order: ListOrder, tab: TabKey, me: string): boolean {
  switch (tab) {
    case "all":
      return order.status !== "ABANDONED";
    case "new":
      return order.status === "NEW" || order.status === "ABANDONED";
    case "open":
      return isOpen(order);
    case "writing":
      return order.status === "WRITING";
    case "draft":
      return order.status === "DRAFT_SENT";
    case "revisions":
      return order.status === "REVISIONS";
    case "delivered":
      return order.status === "DELIVERED";
    case "mine":
      return order.writerId === me && order.status !== "ABANDONED";
  }
}

// Unpaid, waiting for a writer, changes asked for, or late
export const needsAction = (order: ListOrder, now: Date) =>
  order.status === "NEW" || isOpen(order) || order.status === "REVISIONS" || timeLeft(order, now) < 0;

export function matchesQuick(order: ListOrder, quick: QuickKey, now: Date): boolean {
  switch (quick) {
    case "action":
      return needsAction(order, now);
    case "writing":
      return order.status === "WRITING" || order.status === "REVISIONS";
    case "due24":
      return timeLeft(order, now) < 24 * HOUR;
    case "paid": {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      return order.paid && order.paidAt !== null && order.paidAt >= monthStart;
    }
  }
}

function matchesFilters(order: ListOrder, filters: OrderFilters, me: string, now: Date): boolean {
  const { pkg, writer, pay, due, placed } = filters;
  if (pkg && (pkg === "single" ? order.packageName !== null : order.packageName !== pkg)) return false;
  if (writer === "open" && !isOpen(order)) return false;
  if (writer === "mine" && order.writerId !== me) return false;
  if (writer && writer !== "open" && writer !== "mine" && order.writerId !== writer) return false;
  if (pay && order.paid !== (pay === "paid")) return false;
  const left = timeLeft(order, now);
  if (due === "overdue" && !(left < 0)) return false;
  if (due === "6h" && !(left < 6 * HOUR)) return false;
  if (due === "24h" && !(left < 24 * HOUR)) return false;
  if (due === "client" && order.status !== "DRAFT_SENT") return false;
  if (placed === "today" && order.createdAt.toDateString() !== now.toDateString()) return false;
  if (placed === "7d" || placed === "30d") {
    const days = placed === "7d" ? 7 : 30;
    if (now.getTime() - order.createdAt.getTime() > days * 24 * HOUR) return false;
  }
  return true;
}

// Searches only what this viewer can see (a hidden phone number can't be found by searching for it)
function matchesSearch(order: ListOrder, q: string): boolean {
  if (!q) return true;
  const digits = q.replace(/\D/g, "");
  const text = [order.ref, order.clientName, order.itemName, order.writerName, order.receipt]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (text.includes(q.toLowerCase())) return true;
  return digits.length >= 4 && order.clientPhone !== null && order.clientPhone.replace(/\D/g, "").includes(digits);
}

const SORTERS: Record<SortKey, (a: ListOrder, b: ListOrder, now: Date) => number> = {
  newest: (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  oldest: (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  due: (a, b, now) => timeLeft(a, now) - timeLeft(b, now) || b.createdAt.getTime() - a.createdAt.getTime(),
  amount: (a, b) => (b.amount ?? 0) - (a.amount ?? 0),
};

export function filterOrders(orders: ListOrder[], filters: OrderFilters, me: string, now: Date): ListOrder[] {
  return orders
    .filter(
      (order) =>
        // A quick card decides which orders show; the status tabs narrow it further
        matchesTab(order, filters.quick && filters.tab === "all" ? "all" : filters.tab, me) &&
        (!filters.quick || matchesQuick(order, filters.quick, now)) &&
        matchesFilters(order, filters, me, now) &&
        matchesSearch(order, filters.q),
    )
    .sort((a, b) => SORTERS[filters.sort](a, b, now));
}

export function countTabs(orders: ListOrder[], me: string): Record<TabKey, number> {
  return Object.fromEntries(
    TABS.map(({ key }) => [key, orders.filter((order) => matchesTab(order, key, me)).length]),
  ) as Record<TabKey, number>;
}

// The quick cards' numbers (the "paid" card shows money, so it's the owner's only)
export function quickCounts(orders: ListOrder[], now: Date) {
  const live = orders.filter((order) => order.status !== "ABANDONED");
  const paidThisMonth = orders.filter((order) => matchesQuick(order, "paid", now));
  return {
    action: live.filter((order) => needsAction(order, now)).length,
    writing: live.filter((order) => matchesQuick(order, "writing", now)).length,
    due24: live.filter((order) => matchesQuick(order, "due24", now)).length,
    paidAmount: paidThisMonth.reduce((sum, order) => sum + (order.amount ?? 0), 0),
  };
}
