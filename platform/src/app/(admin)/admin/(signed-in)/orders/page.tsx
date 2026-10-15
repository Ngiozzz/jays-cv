import type { Metadata } from "next";
import Link from "next/link";
import { NotAllowed } from "@/components/admin/NotAllowed";
import { DeleteAbandonedButton } from "@/components/admin/orders/OrderControls";
import { OrderFilterBar } from "@/components/admin/orders/OrderFilterBar";
import { Icon } from "@/components/icons/Icon";
import type { IconName } from "@/components/icons/IconSprite";
import { formatKes } from "@/lib/money";
import { pageCount, PAGE_SIZE, parsePage } from "@/modules/orders/orders-history";
import {
  FILTER_OPTIONS,
  filtersHref,
  parseOrderFilters,
  QUICK,
  SORTS,
  TABS,
  type ListOrder,
  type OrderFilters,
  type QuickKey,
} from "@/modules/orders/orders-list";
import { countDeletableOrders } from "@/modules/orders/order-upkeep.service";
import { span, STATUS_TEXT } from "@/modules/orders/orders.rules";
import { listOrderPage } from "@/modules/orders/orders.service";
import { requireMember } from "@/modules/team/current-member";
import { can } from "@/modules/team/permissions";

export const metadata: Metadata = { title: "Orders" };

const ago = (date: Date, now: Date) => {
  const ms = now.getTime() - date.getTime();
  return ms < 60_000 ? "just now" : `${span(ms)} ago`;
};

export default async function OrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  const member = await requireMember();
  if (!can(member, "acceptOrders")) return <NotAllowed what="orders" />;

  const now = new Date();
  const params = await searchParams;
  const filters = parseOrderFilters(params, can(member, "seeMoney"));
  const page = parsePage(params.page);
  const {
    orders: shown,
    total,
    tabs,
    quick,
    money,
    writers,
    packageNames,
  } = await listOrderPage(member, now, filters, page);
  const pages = pageCount(total);
  const chips = activeChips(filters, writers, member.name);
  // Owner only, on "Awaiting payment": clear out every order that was never paid
  const deletable =
    filters.tab === "new" && can(member, "deleteOrders") ? await countDeletableOrders(member.tenant.id) : 0;

  const cards: { key: QuickKey; icon: IconName; tone: string; value: string }[] = [
    { key: "action", icon: "alert", tone: "warn", value: String(quick.action) },
    { key: "writing", icon: "edit", tone: "", value: String(quick.writing) },
    { key: "due24", icon: "clock", tone: "red", value: String(quick.due24) },
    ...(money
      ? [{ key: "paid" as const, icon: "phone" as const, tone: "muted", value: formatKes(quick.paidAmount) }]
      : []),
  ];

  return (
    <>
      <div className="stat-grid quick-grid" role="group" aria-label="Quick filters">
        {cards.map((card) => {
          const on = filters.quick === card.key;
          return (
            <Link
              key={card.key}
              className={["stat-card", card.tone].filter(Boolean).join(" ")}
              href={filtersHref(filters, on ? { quick: "" } : { quick: card.key, tab: "all" })}
              aria-current={on ? "true" : undefined}
              scroll={false}
            >
              <span className="icon-box">
                <Icon name={card.icon} />
              </span>
              <div>
                <strong>{card.value}</strong>
                <span>{QUICK[card.key]}</span>
              </div>
            </Link>
          );
        })}
      </div>
      <p className="quick-hint">Tip: click a card to filter the list. Click it again to clear.</p>

      <section className="panel">
        <div className="table-tools">
          <nav className="tabs" aria-label="Filter by status">
            {TABS.map(({ key, label }) => (
              <Link
                key={key}
                href={filtersHref(filters, { tab: key })}
                aria-current={key === filters.tab ? "page" : undefined}
                className={key === "open" && tabs.open > 0 ? "tab-alert" : undefined}
                scroll={false}
              >
                {label}
                <span>{tabs[key]}</span>
              </Link>
            ))}
          </nav>
          <form className="table-search" role="search">
            {/* Searching keeps the other filters */}
            {[...new URLSearchParams(filtersHref(filters, { q: "" }).split("?")[1] ?? "").entries()].map(
              ([name, value]) => (
                <input key={name} type="hidden" name={name} value={value} />
              ),
            )}
            <label className="sr-only" htmlFor="orders-q">
              Search orders
            </label>
            <Icon name="search" />
            <input
              type="search"
              id="orders-q"
              name="q"
              defaultValue={filters.q}
              placeholder={money ? "Search name, phone, order, M-Pesa code…" : "Search name, order number…"}
            />
          </form>
        </div>
        <div className="filter-row">
          <OrderFilterBar
            filters={filters}
            money={money}
            packageNames={packageNames}
            writers={writers}
            myName={member.name}
          />
        </div>
        <div className="filter-summary">
          <span aria-live="polite">
            {pages > 1
              ? `Showing ${(page - 1) * PAGE_SIZE + 1}–${(page - 1) * PAGE_SIZE + shown.length} of ${total} orders`
              : `${total} ${total === 1 ? "order" : "orders"}`}
          </span>
          <div className="chips">
            {chips.map((chip) => (
              <Link key={chip.label} className="chip" href={filtersHref(filters, chip.clear)} scroll={false}>
                {chip.label}
                <span aria-hidden="true">×</span>
                <span className="sr-only">Remove filter</span>
              </Link>
            ))}
          </div>
          {chips.length > 0 && (
            <Link className="link-btn" href="/admin/orders" scroll={false}>
              Clear all
            </Link>
          )}
          {deletable > 0 && <DeleteAbandonedButton count={deletable} />}
        </div>
        <div className="table-wrap-admin">
          <table className="admin-table orders-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Client</th>
                <th>Package</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Writer</th>
                <th>Due</th>
                <th>
                  <span className="sr-only">Open</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {shown.map((order) => (
                <OrderRow key={order.id} order={order} now={now} />
              ))}
              {shown.length === 0 && (
                <tr>
                  <td colSpan={8} className="table-empty">
                    {tabs.all + tabs.new > 0 ? (
                      <>
                        No orders match these filters. <Link href="/admin/orders">Clear all filters</Link>
                      </>
                    ) : (
                      "No orders yet. Orders placed on the website appear here."
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {pages > 1 && <Pager filters={filters} page={page} pages={pages} />}
      </section>
    </>
  );
}

// Previous / next, and the page numbers around this one (with the first and last always shown)
function Pager({ filters, page, pages }: { filters: OrderFilters; page: number; pages: number }) {
  const href = (to: number) => {
    const base = filtersHref(filters);
    return to === 1 ? base : `${base}${base.includes("?") ? "&" : "?"}page=${to}`;
  };
  const near = [...new Set([1, page - 1, page, page + 1, pages])].filter((n) => n >= 1 && n <= pages);
  return (
    <nav className="pager" aria-label="Pages">
      {page > 1 ? (
        <Link className="btn btn-ghost btn-sm" href={href(page - 1)}>
          ← Previous
        </Link>
      ) : (
        <span />
      )}
      <ol>
        {near.map((n, i) => (
          <li key={n}>
            {i > 0 && n - near[i - 1] > 1 && <span className="pager-gap">…</span>}
            {n === page ? (
              <span aria-current="page">{n}</span>
            ) : (
              <Link href={href(n)} aria-label={`Page ${n}`}>
                {n}
              </Link>
            )}
          </li>
        ))}
      </ol>
      {page < pages ? (
        <Link className="btn btn-ghost btn-sm" href={href(page + 1)}>
          Next →
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}

function OrderRow({ order, now }: { order: ListOrder; now: Date }) {
  const open = order.status === "PAID" && !order.writerId;
  const href = `/admin/orders/${order.ref}`;
  return (
    <tr className={open ? "row-open" : undefined}>
      <td>
        <Link className="order-id" href={href}>
          {order.ref}
        </Link>
        <small className="cell-sub">{ago(order.createdAt, now)}</small>
      </td>
      <td>
        <strong className="cell-strong">{order.clientName}</strong>
        <small className="cell-sub">{order.clientPhone ?? "Shown once accepted"}</small>
      </td>
      <td>
        {order.packageName ?? order.itemName}
        {order.amount !== null && <small className="cell-sub">{formatKes(order.amount)}</small>}
      </td>
      <td>
        {order.paid ? (
          <span className="pay ok">
            <Icon name="check" />
            {order.payChannel}
            {order.receipt && <small>{order.receipt}</small>}
          </span>
        ) : (
          <span className="pay wait">
            <Icon name="clock" />
            Waiting
          </span>
        )}
      </td>
      <td>
        <span className={`ostatus ${STATUS_TEXT[order.status].tone}`}>{STATUS_TEXT[order.status].team}</span>
      </td>
      <td className="cell-muted">
        {order.writerName ??
          (open ? (
            <em className="not-accepted">
              ⚠ Not accepted
              <small>waiting {order.paidAt ? span(now.getTime() - order.paidAt.getTime()) : ""}</small>
            </em>
          ) : (
            "—"
          ))}
      </td>
      <td>
        <span className={`due ${order.due.tone}`}>{order.due.text.replace(/ ·.*/, "")}</span>
      </td>
      <td>
        <Link className="icon-btn" href={href} title="Open order" aria-label={`Open order ${order.ref}`}>
          <Icon name="arrow" />
        </Link>
      </td>
    </tr>
  );
}

// The filters in use, each with what removing it changes
function activeChips(filters: OrderFilters, writers: { id: string; displayName: string }[], myName: string) {
  const chips: { label: string; clear: Partial<OrderFilters> }[] = [];
  if (filters.quick) chips.push({ label: QUICK[filters.quick], clear: { quick: "" } });
  if (filters.pkg)
    chips.push({
      label: `Package: ${filters.pkg === "single" ? "Single services" : filters.pkg}`,
      clear: { pkg: "" },
    });
  if (filters.writer) {
    const name =
      filters.writer === "open"
        ? "Not accepted"
        : filters.writer === "mine"
          ? `Mine (${myName})`
          : (writers.find((writer) => writer.id === filters.writer)?.displayName ?? "Unknown");
    chips.push({ label: `Writer: ${name}`, clear: { writer: "" } });
  }
  if (filters.pay) chips.push({ label: `Payment: ${FILTER_OPTIONS.pay[filters.pay]}`, clear: { pay: "" } });
  if (filters.due) chips.push({ label: `Due: ${FILTER_OPTIONS.due[filters.due]}`, clear: { due: "" } });
  if (filters.placed) chips.push({ label: `Placed: ${FILTER_OPTIONS.placed[filters.placed]}`, clear: { placed: "" } });
  if (filters.sort !== "newest") chips.push({ label: `Sort: ${SORTS[filters.sort]}`, clear: { sort: "newest" } });
  if (filters.q) chips.push({ label: `"${filters.q}"`, clear: { q: "" } });
  return chips;
}
