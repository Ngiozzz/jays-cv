import Link from "next/link";
import { formatKes, formatNumber } from "@/lib/money";
import type { DashboardData } from "@/modules/dashboard/dashboard.service";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

// The owner's month at a glance. Writers never get this (the service doesn't even load it for them).
export function BusinessCards({
  business,
  notAccepted,
}: {
  business: NonNullable<DashboardData["business"]>;
  notAccepted: number;
}) {
  const { tokens } = business;
  return (
    <section className="biz">
      <div className="biz-head">
        <h2>This month</h2>
        <span>Only you see this</span>
      </div>
      <div className="biz-cards">
        <Link className="biz-card" href="/admin/finance">
          <span>Takings</span>
          <strong>{formatKes(business.takings)}</strong>
          <small>{plural(business.paidCount, "order")} paid</small>
        </Link>
        <Link className="biz-card keep" href="/admin/finance">
          <span>You keep</span>
          <strong>{formatKes(business.keep)}</strong>
          <small>after fees and writer pay</small>
        </Link>
        <Link className="biz-card" href="/admin/finance">
          <span>Writer pay owed</span>
          <strong>{formatKes(business.owedTotal)}</strong>
          <small>{business.owedWriters ? `to ${plural(business.owedWriters, "writer")}` : "all paid up"}</small>
        </Link>
        <Link className={notAccepted ? "biz-card alert" : "biz-card"} href="/admin/orders?status=open">
          <span>{notAccepted ? "⚠ " : ""}Not accepted</span>
          <strong>{notAccepted}</strong>
          <small>paid, waiting for a writer</small>
        </Link>
        <a className={tokens.low ? "biz-card tokens alert" : "biz-card tokens"} href="#ai-usage">
          <span>AI tokens</span>
          <strong>{formatNumber(tokens.remaining)}</strong>
          <small>
            {tokens.percentLeft}% of {formatNumber(tokens.granted)} left
            {business.postersLeft !== null ? ` · ≈ ${formatNumber(business.postersLeft)} posters` : ""}
          </small>
        </a>
        <Link className="biz-card" href="/admin/team">
          <span>Team</span>
          <strong>{plural(business.activeWriters, "writer")}</strong>
          <small>
            {business.invitedWriters} invited · {business.pausedWriters} paused
          </small>
        </Link>
      </div>
    </section>
  );
}
