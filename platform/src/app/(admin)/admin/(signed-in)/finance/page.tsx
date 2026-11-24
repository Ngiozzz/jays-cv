import type { Metadata } from "next";
import Link from "next/link";
import { NotAllowed } from "@/components/admin/NotAllowed";
import { Icon } from "@/components/icons/Icon";
import { formatKes } from "@/lib/money";
import { parsePeriod, PERIOD_LABEL, type Period } from "@/modules/finance/finance.rules";
import { loadFinance, type FinanceData } from "@/modules/finance/finance.service";
import { requireMember } from "@/modules/team/current-member";
import { can } from "@/modules/team/permissions";

export const metadata: Metadata = { title: "Finance" };

const PERIOD_TABS: { key: Period; label: string }[] = [
  { key: "month", label: "This month" },
  { key: "30", label: "Last 30 days" },
  { key: "all", label: "All time" },
];

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    timeZone: "Africa/Nairobi",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

// The owner's money: what came in, from which packages, and what's still waiting to be paid.
// Writers are on a monthly salary, paid outside the app, so there's no pay per CV here.
export default async function FinancePage({ searchParams }: PageProps<"/admin/finance">) {
  const member = await requireMember();
  if (!can(member, "manageFinance")) return <NotAllowed what="the business money" />;

  const period = parsePeriod((await searchParams).period);
  const data = await loadFinance(member, period);
  const label = PERIOD_LABEL[period];
  const paidOrders = data.payments.filter((payment) => payment.order).length;

  return (
    <>
      <div className="page-bar">
        <p>Money in from clients, paid straight to your Pay Bill.</p>
        <div className="page-actions">
          <nav className="seg-toggle" aria-label="Period">
            {PERIOD_TABS.map((tab) => (
              <Link
                key={tab.key}
                href={tab.key === "month" ? "/admin/finance" : `/admin/finance?period=${tab.key}`}
                aria-current={tab.key === period ? "page" : undefined}
              >
                {tab.label}
              </Link>
            ))}
          </nav>
          <a className="btn btn-ghost btn-sm" href={`/admin/finance/export?period=${period}`} download>
            <Icon name="download" />
            Download CSV
          </a>
        </div>
      </div>

      <div className="stats">
        <Stat
          label="Takings"
          value={data.takings}
          note={`${plural(data.payments.length, "payment")} ${label}`}
          strong
        />
        <Stat label="Average order" value={data.average} note={`Across ${plural(paidOrders, "paid order")}`} />
        <Stat
          label="Waiting for payment"
          value={data.waiting.amount}
          note={`${plural(data.waiting.count, "order")} placed, not paid yet`}
        />
        <Stat
          label="Middleman fees"
          value={data.fees}
          note={data.fees ? "M-Pesa and gateway fees" : "Paid straight to your Pay Bill"}
        />
      </div>

      <div className="fin-grid">
        <section className="panel">
          <div className="panel-head">
            <h2>Takings by package</h2>
            <span className="hint-sm">{label}</span>
          </div>
          <PackageBars data={data} label={label} />
        </section>
        <section className="panel">
          <div className="panel-head">
            <h2>Other money</h2>
          </div>
          <ul className="rows tally plain">
            <li>
              <span>
                <span className="row-t">Abandoned</span>
                <span className="row-s">
                  {plural(data.abandoned.count, "order")} never paid {label}
                </span>
              </span>
              <b>{formatKes(data.abandoned.amount)}</b>
            </li>
            <li>
              <span>
                <span className="row-t">Not linked to an order</span>
                <span className="row-s">
                  {plural(data.unlinked.count, "Pay Bill payment")} {label}, with a name or a wrong number as the
                  account
                </span>
              </span>
              <b>{formatKes(data.unlinked.amount)}</b>
            </li>
            <li>
              <span>
                <span className="row-t">You keep</span>
                <span className="row-s">Takings less fees. Salaries are paid outside the app.</span>
              </span>
              <b className="gold">{formatKes(data.keep)}</b>
            </li>
          </ul>
        </section>
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Payments</h2>
            <p className="panel-sub">M-Pesa payments, matched to orders automatically.</p>
          </div>
          <span className="hint-sm">
            {plural(data.payments.length, "payment")} {label}
          </span>
        </div>
        <div className="table-wrap-admin">
          <table className="admin-table fin-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Client</th>
                <th>Package</th>
                <th>Method</th>
                <th>M-Pesa code</th>
                <th className="n">Amount</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {data.payments.map((payment) => (
                <tr key={payment.id}>
                  <td>
                    {payment.order ? (
                      <Link className="order-id" href={`/admin/orders/${payment.order}`}>
                        {payment.order}
                      </Link>
                    ) : (
                      <span className="hint-sm">No order</span>
                    )}
                  </td>
                  <td>{payment.client}</td>
                  <td>{payment.item}</td>
                  <td>{payment.channel}</td>
                  <td>
                    <span className="ref">{payment.receipt ?? "None"}</span>
                  </td>
                  <td className="n">{formatKes(payment.amount)}</td>
                  <td className="cell-sub">{when(payment.confirmedAt)}</td>
                </tr>
              ))}
              {data.payments.length === 0 && (
                <tr>
                  <td colSpan={7} className="empty-note">
                    No payments {label}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function Stat({ label, value, note, strong }: { label: string; value: number; note: string; strong?: boolean }) {
  return (
    <div className="stat">
      <span className="stat-l">{label}</span>
      <span className={strong ? "stat-v key" : "stat-v"} aria-label={formatKes(value)}>
        <small>KES</small>
        {value.toLocaleString("en-KE")}
      </span>
      <span className="stat-c">{note}</span>
    </div>
  );
}

// One colour, the amount at the end of each bar
function PackageBars({ data, label }: { data: FinanceData; label: string }) {
  if (data.byPackage.length === 0) return <p className="panel-body empty-note">No payments {label} yet.</p>;
  const max = Math.max(1, ...data.byPackage.map((item) => item.amount));
  return (
    <ul className="pkg-bars">
      {data.byPackage.map((item) => (
        <li key={item.name}>
          <span className="pb-name">
            {item.name}
            <small>{plural(item.count, "order")}</small>
          </span>
          <span className="pb-track">
            <span style={{ width: `${(item.amount / max) * 100}%` }} />
          </span>
          <b>{formatKes(item.amount)}</b>
        </li>
      ))}
    </ul>
  );
}
