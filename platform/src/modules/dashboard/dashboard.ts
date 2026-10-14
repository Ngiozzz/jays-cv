import type { OrderStatus } from "@/generated/prisma/enums";
import { daysUntil } from "@/modules/jobs/jobs.rules";
import type { JobDisplayStatus } from "@/modules/jobs/jobs.rules";
import { needsAction, type ListOrder } from "@/modules/orders/orders-list";
import { DAY, span } from "@/modules/orders/orders.rules";

// The Dashboard's pictures of the work. Pure: the orders and jobs come in already filtered by
// what this viewer may see, and the time is passed in.

// ---------- CV progress ----------

// One gold hue, light → dark = further along (validated for the preview's chart)
export const STAGES = [
  { key: "WRITING", label: "Writing", color: "#CFA651", ink: "#0D0D0D" },
  { key: "DRAFT_SENT", label: "With client", color: "#A9842F", ink: "#0D0D0D" },
  { key: "REVISIONS", label: "Revisions", color: "#7A5E22", ink: "#ffffff" },
  { key: "DELIVERED", label: "Delivered (30 days)", color: "#3B2C0E", ink: "#ffffff" },
] as const satisfies readonly { key: OrderStatus; label: string; color: string; ink: string }[];
export type StageKey = (typeof STAGES)[number]["key"];

const IN_PROGRESS: readonly OrderStatus[] = ["WRITING", "DRAFT_SENT", "REVISIONS"];

// Which bar segment an order counts in, if any: delivered CVs only for 30 days
export function stageOf(order: Pick<ListOrder, "status" | "deliveredAt">, now: Date): StageKey | null {
  if (order.status === "DELIVERED")
    return order.deliveredAt && now.getTime() - order.deliveredAt.getTime() <= 30 * DAY ? "DELIVERED" : null;
  return IN_PROGRESS.includes(order.status) ? (order.status as StageKey) : null;
}

export type Person = { id: string; name: string };
export type ProgressRow = {
  id: string;
  name: string;
  total: number;
  stages: { key: StageKey; refs: string[] }[];
};

// One row per person: the owner sees every writer (and themself, if they write), a writer only themself
export function progressRows(orders: ListOrder[], people: Person[], now: Date): ProgressRow[] {
  return people.map((person) => {
    const theirs = orders.filter((order) => order.writerId === person.id);
    const stages = STAGES.map(({ key }) => ({
      key,
      refs: theirs.filter((order) => stageOf(order, now) === key).map((order) => order.ref),
    }));
    return { id: person.id, name: person.name, total: stages.reduce((n, s) => n + s.refs.length, 0), stages };
  });
}

const byDeadline = (a: ListOrder, b: ListOrder) =>
  (a.deadline?.getTime() ?? Number.POSITIVE_INFINITY) - (b.deadline?.getTime() ?? Number.POSITIVE_INFINITY);

// The viewer's own CVs still being worked on, most urgent first
export const myCvs = (orders: ListOrder[], me: string) =>
  orders.filter((order) => order.writerId === me && IN_PROGRESS.includes(order.status)).sort(byDeadline);

// ---------- Orders ----------

export const isOpenOrder = (order: ListOrder) => order.status === "PAID" && !order.writerId;

// Paid and waiting for a writer, longest waiting first
export const openOrders = (orders: ListOrder[]) =>
  orders.filter(isOpenOrder).sort((a, b) => (a.paidAt?.getTime() ?? 0) - (b.paidAt?.getTime() ?? 0));

// "3h", "2d 4h": how long a paid order has waited for a writer
export const waitingFor = (order: ListOrder, now: Date) =>
  span(now.getTime() - (order.paidAt ?? order.createdAt).getTime());

// The orders list's "Need action", most urgent first: not accepted, then by deadline
export function ordersNeedingAttention(orders: ListOrder[], now: Date, limit = 5): ListOrder[] {
  return orders
    .filter((order) => order.status !== "ABANDONED" && needsAction(order, now))
    .sort((a, b) => Number(isOpenOrder(b)) - Number(isOpenOrder(a)) || byDeadline(a, b))
    .slice(0, limit);
}

// ---------- Jobs ----------

export type DashboardJob = { id: string; shownAs: JobDisplayStatus; deadline: string | null; postedDay: string };

export function jobSummary<T extends DashboardJob>(jobs: T[], today: string, limit = 5) {
  const live = jobs.filter((job) => job.shownAs === "published");
  const closingSoon = live
    .filter((job) => job.deadline !== null && daysUntil(job.deadline, today) <= 7)
    .sort((a, b) => a.deadline!.localeCompare(b.deadline!));
  return {
    live: live.length,
    closingSoon: closingSoon.length,
    drafts: jobs.filter((job) => job.shownAs === "draft").length,
    expired: jobs.filter((job) => job.shownAs === "expired").length,
    closingList: closingSoon.slice(0, limit),
    recent: [...jobs].sort((a, b) => b.postedDay.localeCompare(a.postedDay)).slice(0, limit),
  };
}

// ---------- Greeting ----------

export function greeting(now: Date): string {
  const hour = Number(now.toLocaleString("en-GB", { hour: "numeric", hour12: false, timeZone: "Africa/Nairobi" }));
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}
