import type { Metadata } from "next";
import Link from "next/link";
import { TeamAllowances } from "@/components/admin/ai/TeamAllowances";
import { OpenTokenRequest, RequestTokensButton } from "@/components/admin/dashboard/TokenRequest";
import { NotAllowed } from "@/components/admin/NotAllowed";
import { formatNumber } from "@/lib/money";
import { loadAiPage, type AiPageData } from "@/modules/ai/tokens.service";
import { requireMember } from "@/modules/team/current-member";
import { can } from "@/modules/team/permissions";

export const metadata: Metadata = { title: "AI" };

const kenya = (iso: string, options: Intl.DateTimeFormatOptions) =>
  new Date(iso).toLocaleString("en-GB", { timeZone: "Africa/Nairobi", ...options });
const dayMonth = (iso: string) => kenya(iso, { day: "numeric", month: "short" });
const time = (iso: string) => kenya(iso, { weekday: "short", hour: "2-digit", minute: "2-digit" });

const ADDED_LABEL: Record<string, string> = {
  GRANT: "Monthly allowance",
  TOP_UP: "Top-up you asked for",
  ADJUSTMENT: "Correction",
};

// Admin → AI (owner): tokens power poster reading, job links, CV checks and the writers' AI helper.
// The owner sees tokens only, never what they cost.
export default async function AiPage() {
  const member = await requireMember();
  if (!can(member, "requestTokens")) return <NotAllowed what="the AI tokens" />;
  const data = await loadAiPage(member);
  const { balance } = data;
  const runsOutBeforeMonthEnd =
    data.runsOutOn !== null && new Date(data.runsOutOn).getMonth() === new Date().getMonth();

  return (
    <>
      <div className="page-bar">
        <p>
          Tokens power poster reading, job links, CV checks and the writers&apos; AI helper. You see tokens, never
          money.
        </p>
        <div className="page-actions">{!data.request && <RequestTokensButton />}</div>
      </div>

      {data.request && (
        <OpenTokenRequest
          id={data.request.id}
          tokens={data.request.tokens}
          note={data.request.note}
          createdAt={data.request.createdAt}
        />
      )}

      <section className="panel ai-balance" aria-labelledby="ai-left">
        <div className="ai-left">
          <span className="stat-l" id="ai-left">
            Tokens left
          </span>
          <span className={balance.low ? "stat-v late" : "stat-v"}>{formatNumber(balance.remaining)}</span>
          <span className="stat-c">of {formatNumber(balance.granted)} given</span>
          <div className={balance.low ? "meter low" : "meter"}>
            <span style={{ width: `${balance.percentLeft}%` }} />
          </div>
          <span className="meter-scale">
            <span>0</span>
            <span>Warn at {data.warnPct}%</span>
            <span>{formatNumber(balance.granted)}</span>
          </span>
        </div>
        <div className="stat">
          <span className="stat-l">Used a day this month</span>
          <span className="stat-v">{formatNumber(data.pace.perDay)}</span>
          <span className="stat-c">{formatNumber(data.usedThisMonth)} so far</span>
        </div>
        <div className="stat">
          <span className="stat-l">Left at this pace</span>
          <span className="stat-v">{data.pace.daysLeft === null ? "No end" : `About ${data.pace.daysLeft} days`}</span>
          <span className="stat-c">
            {data.runsOutOn ? `To around ${dayMonth(data.runsOutOn)}` : "Nothing used this month yet"}
          </span>
        </div>
        <div className="stat">
          <span className="stat-l">Posters you could still read</span>
          <span className="stat-v">
            {data.postersLeft === null ? "Not known" : `About ${formatNumber(data.postersLeft)}`}
          </span>
          <span className="stat-c">At this month&apos;s average</span>
        </div>
      </section>

      {(balance.paused || runsOutBeforeMonthEnd || balance.remaining <= 0) && (
        <div className="attention" role="alert">
          <span className="dot" aria-hidden="true" />
          <p className="attention-text">
            {balance.paused
              ? "The AI is paused by your developer. Ask them to switch it back on."
              : balance.remaining <= 0
                ? "The tokens have run out, so the AI buttons are paused. Request more to carry on."
                : "This month's tokens run out before the month ends at this pace. Request more now, since your developer may take up to a day to add them."}
          </p>
        </div>
      )}

      <div className="ai-grid">
        <section className="panel">
          <div className="panel-head">
            <h2>Used each day</h2>
            <span className="hint-sm">{formatNumber(data.usedThisMonth)} this month</span>
          </div>
          <DailyChart days={data.days} />
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>What it was used for</h2>
            <span className="hint-sm">This month</span>
          </div>
          <Features data={data} />
        </section>
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Share among the team</h2>
            <p className="panel-sub">
              A monthly allowance per person. Writers who run out see &ldquo;Ask the business owner&rdquo;.
              {data.unassigned > 0 &&
                ` Clients' CV checks and automatic runs used ${formatNumber(data.unassigned)} and belong to nobody.`}
            </p>
          </div>
        </div>
        <TeamAllowances team={data.team} poolFallback={data.poolFallback} />
      </section>

      <div className="ai-grid">
        <section className="panel">
          <div className="panel-head">
            <h2>Latest AI runs</h2>
          </div>
          <table className="admin-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Who</th>
                <th>What</th>
                <th className="n">Tokens</th>
              </tr>
            </thead>
            <tbody>
              {data.runs.map((run) => (
                <tr key={run.id}>
                  <td className="cell-sub">{time(run.at)}</td>
                  <td>{run.who}</td>
                  <td>
                    {run.what}
                    {run.order && (
                      <>
                        {" · "}
                        <Link className="order-id" href={`/admin/orders/${run.order}`}>
                          {run.order}
                        </Link>
                      </>
                    )}
                  </td>
                  <td className="n">{formatNumber(run.tokens)}</td>
                </tr>
              ))}
              {data.runs.length === 0 && (
                <tr>
                  <td colSpan={4} className="empty-note">
                    The AI hasn&apos;t run yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Tokens added</h2>
            <Link href="/admin/content?tab=settings">Warning level: {data.warnPct}%</Link>
          </div>
          <ul className="rows tally plain">
            {data.added.map((entry) => (
              <li key={entry.id}>
                <span>
                  <span className="row-t">{ADDED_LABEL[entry.kind] ?? "Added"}</span>
                  <span className="row-s">
                    {dayMonth(entry.at)}
                    {entry.note && ` · ${entry.note}`}
                  </span>
                </span>
                <b className={entry.tokens < 0 ? "late" : undefined}>
                  {entry.tokens > 0 ? "+" : ""}
                  {formatNumber(entry.tokens)}
                </b>
              </li>
            ))}
            {data.added.length === 0 && <li className="empty-note">No tokens added yet.</li>}
          </ul>
        </section>
      </div>
    </>
  );
}

// One bar per day, today in gold; the busiest day labelled
function DailyChart({ days }: { days: AiPageData["days"] }) {
  const max = Math.max(1, ...days.map((d) => d.tokens));
  const busiest = days.reduce((a, b) => (b.tokens > a.tokens ? b : a), days[0]);
  const label = (day: string) => kenya(`${day}T09:00:00Z`, { day: "numeric", month: "short" });
  return (
    <div className="day-chart">
      <div
        className="day-bars"
        role="img"
        aria-label={`Tokens used each day this month. Busiest: ${label(busiest.day)}, ${formatNumber(busiest.tokens)}.`}
      >
        {days.map((d, i) => (
          <span
            key={d.day}
            className={i === days.length - 1 ? "today" : undefined}
            style={{ height: `${Math.max(2, (d.tokens / max) * 100)}%` }}
            title={`${label(d.day)}: ${formatNumber(d.tokens)} tokens`}
          />
        ))}
      </div>
      <div className="day-axis">
        <span>{label(days[0].day)}</span>
        <span>Today</span>
      </div>
      {busiest.tokens > 0 && (
        <p className="hint-sm">
          Busiest day: {label(busiest.day)}, {formatNumber(busiest.tokens)} tokens.
        </p>
      )}
    </div>
  );
}

function Features({ data }: { data: AiPageData }) {
  if (data.byFeature.length === 0) return <p className="panel-body empty-note">No AI used yet this month.</p>;
  const total = Math.max(1, data.usedThisMonth);
  return (
    <ul className="pkg-bars">
      {data.byFeature.map((feature) => (
        <li key={feature.feature}>
          <span className="pb-name">
            {feature.feature}
            <small>
              {formatNumber(feature.runs)} {feature.runs === 1 ? "run" : "runs"} · about{" "}
              {formatNumber(Math.round(feature.tokens / Math.max(1, feature.runs)))} each
            </small>
          </span>
          <span className="pb-track">
            <span style={{ width: `${(feature.tokens / total) * 100}%` }} />
          </span>
          <b>{Math.round((feature.tokens / total) * 100)}%</b>
        </li>
      ))}
    </ul>
  );
}
