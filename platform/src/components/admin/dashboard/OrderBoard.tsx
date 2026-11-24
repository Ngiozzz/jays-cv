import Link from "next/link";
import { StageTrack } from "@/components/site/StageTrack";
import { formatKes } from "@/lib/money";
import { BOARD_STAGE, type orderBoard } from "@/modules/dashboard/dashboard";
import { span } from "@/modules/orders/orders.rules";
import type { ListOrder } from "@/modules/orders/orders-list";

type Column = ReturnType<typeof orderBoard>[number];

// Which Orders list tab each column opens
const TAB: Record<Column["key"], string> = {
  new: "new",
  open: "open",
  writing: "writing",
  draft: "draft",
  revisions: "revisions",
  delivered: "delivered",
};

// The moment on the Dashboard: each order is a sheet on the desk, moving left to right
export function OrderBoard({ columns, now, writing }: { columns: Column[]; now: Date; writing: string[] }) {
  const total = columns.reduce((sum, column) => sum + column.count, 0);
  return (
    <section className="panel board-panel" aria-labelledby="board-title">
      <div className="panel-head">
        <h2 id="board-title">Order board</h2>
        <span className="hint-sm">
          {total} {total === 1 ? "order" : "orders"}
          {writing.length > 0 && ` · ${listNames(writing)} writing`}
        </span>
      </div>
      <div className="board">
        {columns.map((column) => (
          <div key={column.key} className="board-col">
            <h3>
              {column.label} <span>{column.count}</span>
            </h3>
            <div className="lane">
              {column.orders.map((order) => (
                <Sheet key={order.id} order={order} column={column.key} now={now} />
              ))}
              {column.more > 0 && (
                <Link className="lane-more" href={`/admin/orders?tab=${TAB[column.key]}`}>
                  and {column.more} more
                </Link>
              )}
              {column.count === 0 && <p className="lane-note">None</p>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Sheet({ order, column, now }: { order: ListOrder; column: Column["key"]; now: Date }) {
  const open = column === "open";
  const late = order.due.tone === "late";
  return (
    <Link
      href={`/admin/orders/${order.ref}`}
      className={open ? "sheet flag" : column === "delivered" ? "sheet dim" : "sheet"}
    >
      <span className="ref">{order.ref}</span>
      <span className="sheet-who">{order.clientName}</span>
      <span className="sheet-pk">
        {order.packageName ?? order.itemName}
        {order.amount !== null && <small>{formatKes(order.amount)}</small>}
      </span>
      <StageTrack of={5} at={BOARD_STAGE[column]} />
      <span className="sheet-foot">
        <span>{order.writerName?.split(" ")[0] ?? (column === "new" ? "No writer yet" : "Nobody yet")}</span>
        {open ? (
          <span className="late">Waiting {span(now.getTime() - (order.paidAt ?? order.createdAt).getTime())}</span>
        ) : column === "new" ? (
          <span>{span(now.getTime() - order.createdAt.getTime())} ago</span>
        ) : column === "delivered" ? (
          <span>{span(now.getTime() - (order.deliveredAt ?? now).getTime())} ago</span>
        ) : (
          <span className={late ? "late" : undefined}>{order.due.text.replace(/ ·.*/, "")}</span>
        )}
      </span>
    </Link>
  );
}

// "Grace, Brian and Aisha"
function listNames(names: string[]) {
  return names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}
