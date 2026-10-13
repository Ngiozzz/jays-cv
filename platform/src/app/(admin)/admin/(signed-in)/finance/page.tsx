import type { Metadata } from "next";
import Link from "next/link";
import { PayoutButton, UndoPayoutButton } from "@/components/admin/finance/PayoutControls";
import { NotAllowed } from "@/components/admin/NotAllowed";
import { Icon } from "@/components/icons/Icon";
import type { IconName } from "@/components/icons/IconSprite";
import { formatKes } from "@/lib/money";
import { parsePeriod, PERIOD_LABEL, percentOf, type Period } from "@/modules/finance/finance.rules";
import { loadFinance, type FinanceData } from "@/modules/finance/finance.service";
import { requireMember } from "@/modules/team/current-member";
import { can } from "@/modules/team/permissions";

export const metadata: Metadata = { title: "Finance" };

const PERIOD_TABS: { key: Period; label: string }[] = [
  { key: "month", label: "This month" },
  { key: "30", label: "Last 30 days" },
  { key: "all", label: "All time" },
];

// Ordinal gold ramp, darkest first (validated for the preview's dashboard chart)
const SPLIT_COLORS = ["#3B2C0E", "#7A5E22", "#A9842F"];

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Africa/Nairobi" });
const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

export default async function FinancePage({ searchParams }: PageProps<"/admin/finance">) {
  const member = await requireMember();
  if (!can(member, "manageFinance")) return <NotAllowed what="the business money" />;

  const period = parsePeriod((await searchParams).period);
  const data = await loadFinance(member, period);
  const when = PERIOD_LABEL[period];

  return (
    <>
      <div className="fin-top">
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
          Download payments (CSV)
        </a>
      </div>

      <div className="stat-grid fin-stats">
        <Stat icon="cash" value={data.takings} label={`Takings ${when} · ${plural(data.payments.length, "payment")}`} />
        <Stat
          icon="shield"
          value={data.fees}
          label={data.fees ? "M-Pesa and middleman fees" : "Middleman fees: paid straight to your Paybill"}
          tone="muted"
        />
        <Stat icon="users" value={data.writerPay} label="Writer pay earned" tone="muted" />
        <Stat icon="check" value={data.keep} label={`You keep (${percentOf(data.keep, data.takings)}%)`} tone="keep" />
      </div>

      <div className="fin-grid">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Where the money goes</h2>
              <p className="panel-sub">Every shilling clients paid, split up.</p>
            </div>
          </div>
          <div className="panel-body">
            <MoneySplit data={data} when={when} />
          </div>
        </section>
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Takings by package</h2>
              <p className="panel-sub">Which services bring in the money.</p>
            </div>
          </div>
          <div className="panel-body">
            <PackageBars data={data} when={when} />
          </div>
        </section>
      </div>

      <section className="panel fin-section">
        <div className="panel-head">
          <div>
            <h2>Writer pay</h2>
            <p className="panel-sub">
              Earned when a CV is delivered, at each writer&apos;s rate. Send the money by M-Pesa as usual, then record
              it here.
            </p>
          </div>
        </div>
        <div className="table-wrap-admin">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Writer</th>
                <th>Rate</th>
                <th>CVs delivered</th>
                <th>Earned</th>
                <th>Paid out</th>
                <th>Owed now</th>
                <th>
                  <span className="sr-only">Pay</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.writers.map((writer) => (
                <tr key={writer.id}>
                  <td>
                    <strong>{writer.name}</strong>
                    {writer.status !== "ACTIVE" && (
                      <>
                        {" "}
                        <span className={`mstatus ${writer.status.toLowerCase()}`}>
                          {writer.status === "PAUSED" ? "Paused" : "Removed"}
                        </span>
                      </>
                    )}
                  </td>
                  <td>{writer.payPercent}%</td>
                  <td>{writer.deliveredInPeriod}</td>
                  <td>{formatKes(writer.earnedInPeriod)}</td>
                  <td>{formatKes(writer.paidOut)}</td>
                  <td>
                    <b>{formatKes(writer.owed)}</b>
                  </td>
                  <td>
                    {writer.owed > 0 ? (
                      <PayoutButton writerId={writer.id} writerName={writer.name} owed={writer.owed} />
                    ) : (
                      <small className="hint-sm">All paid</small>
                    )}
                  </td>
                </tr>
              ))}
              {data.writers.length === 0 && (
                <tr>
                  <td colSpan={7} className="empty-note">
                    No writers yet. Invite one on the <Link href="/admin/team">Team</Link> page.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {data.recentPayouts.length > 0 && (
          <div className="panel-body fin-payouts">
            <p className="preview-label">Recent payouts</p>
            <ul>
              {data.recentPayouts.map((payout) => (
                <li key={payout.id}>
                  <span>{shortDate(payout.paidAt)}</span>
                  <strong>{payout.writer}</strong>
                  <span>{payout.reference ?? "No M-Pesa code"}</span>
                  <b>{formatKes(payout.amount)}</b>
                  <UndoPayoutButton payoutId={payout.id} label={`${formatKes(payout.amount)} to ${payout.writer}`} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Payments</h2>
          <span className="hint-sm">
            {plural(data.payments.length, "payment")} {when}
          </span>
        </div>
        <div className="table-wrap-admin">
          <table className="admin-table fin-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Order</th>
                <th>Client</th>
                <th>Package</th>
                <th>How paid</th>
                <th>M-Pesa code</th>
                <th className="num">Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.payments.map((payment) => (
                <tr key={payment.id}>
                  <td>{shortDate(payment.confirmedAt)}</td>
                  <td>
                    <span className="order-id">{payment.order}</span>
                  </td>
                  <td>{payment.client}</td>
                  <td>{payment.item}</td>
                  <td>{payment.channel}</td>
                  <td>{payment.receipt ?? "—"}</td>
                  <td className="num">
                    <b>{formatKes(payment.amount)}</b>
                  </td>
                </tr>
              ))}
              {data.payments.length === 0 && (
                <tr>
                  <td colSpan={7} className="empty-note">
                    No payments {when}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel panel-body fin-unpaid">
        <div>
          <p className="preview-label">Waiting for payment</p>
          <strong>{formatKes(data.waiting.amount)}</strong>
          <small>{plural(data.waiting.count, "order")} placed but not paid yet</small>
        </div>
        <div>
          <p className="preview-label">Abandoned</p>
          <strong>{formatKes(data.abandoned.amount)}</strong>
          <small>
            {plural(data.abandoned.count, "order")} never paid {when}
          </small>
        </div>
        {data.unlinked.count > 0 && (
          <div>
            <p className="preview-label">Not linked to an order</p>
            <strong>{formatKes(data.unlinked.amount)}</strong>
            <small>
              {plural(data.unlinked.count, "Paybill payment")} {when}, not counted in takings
            </small>
          </div>
        )}
      </section>
    </>
  );
}

function Stat({ icon, value, label, tone }: { icon: IconName; value: number; label: string; tone?: "muted" | "keep" }) {
  return (
    <div className={tone ? `stat-card ${tone}` : "stat-card"}>
      <span className="icon-box">
        <Icon name={icon} />
      </span>
      <div>
        <strong>{formatKes(value)}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}

// Part-to-whole: one bar, every part labelled with its amount (never colour alone)
function MoneySplit({ data, when }: { data: FinanceData; when: string }) {
  if (!data.takings) return <p className="empty-note">No payments {when} yet.</p>;
  const parts = (
    [
      ["You keep", data.keep],
      ["Writer pay", data.writerPay],
      ["Fees", data.fees],
    ] as const
  ).filter(([, value]) => value > 0);
  const total = parts.reduce((sum, [, value]) => sum + value, 0) || 1;
  return (
    <>
      <div
        className="split-bar"
        role="img"
        aria-label={parts.map(([label, value]) => `${label}: ${formatKes(value)}`).join(", ")}
      >
        {parts.map(([label, value], i) => (
          <span
            key={label}
            style={{ flex: value, background: SPLIT_COLORS[i] }}
            title={`${label}: ${formatKes(value)} (${percentOf(value, total)}%)`}
          />
        ))}
      </div>
      <ul className="split-legend">
        {parts.map(([label, value], i) => (
          <li key={label}>
            <span className="sw" style={{ background: SPLIT_COLORS[i] }} />
            {label}
            <b>{formatKes(value)}</b>
            <small>{percentOf(value, total)}%</small>
          </li>
        ))}
      </ul>
      {data.keep < 0 && (
        <p className="hint-sm">
          Writer pay for CVs delivered {when} is more than was paid in, so you keep less than nothing.
        </p>
      )}
      <p className="hint-sm">Writer pay counts CVs delivered {when}.</p>
    </>
  );
}

// One colour, the value at the end of each bar
function PackageBars({ data, when }: { data: FinanceData; when: string }) {
  if (data.byPackage.length === 0) return <p className="empty-note">No payments {when} yet.</p>;
  const max = Math.max(1, ...data.byPackage.map((item) => item.amount));
  return (
    <ul className="hbars">
      {data.byPackage.map((item) => (
        <li key={item.name}>
          <span className="hb-label">{item.name}</span>
          <span className="hb-track">
            <span
              className="hb-bar"
              style={{ width: `${(item.amount / max) * 100}%` }}
              title={`${item.name}: ${formatKes(item.amount)} from ${plural(item.count, "order")}`}
            />
          </span>
          <b>{formatKes(item.amount)}</b>
        </li>
      ))}
    </ul>
  );
}
