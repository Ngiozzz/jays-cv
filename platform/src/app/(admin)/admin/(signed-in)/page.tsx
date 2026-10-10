import type { Metadata } from "next";
import { formatNumber } from "@/lib/money";
import { getTokenBalance } from "@/modules/ai/tokens.service";
import { requireMember, type CurrentMember } from "@/modules/team/current-member";
import { can, type Permission } from "@/modules/team/permissions";

export const metadata: Metadata = { title: "Dashboard" };

const ACCESS: { permission: Permission; label: string }[] = [
  { permission: "acceptOrders", label: "Accept and write CV orders" },
  { permission: "postJobs", label: "Post jobs to the jobs board" },
  { permission: "draftCareerTips", label: "Draft career tips" },
  { permission: "seeMoney", label: "See prices, takings and payouts" },
  { permission: "manageTeam", label: "Invite, pause and remove team members" },
  { permission: "editWebsiteContent", label: "Edit website content and settings" },
];

export default async function DashboardPage() {
  const member = await requireMember();
  const firstName = member.name.split(" ")[0];

  return (
    <>
      <div className="welcome">
        <div>
          <h2>Hello, {firstName} 👋</h2>
          <p>
            You&apos;re signed in to {member.tenant.name} as {member.role === "OWNER" ? "the owner" : "a writer"}.
          </p>
        </div>
      </div>

      {member.role === "OWNER" && <OwnerSummary member={member} />}

      <section className="panel">
        <div className="panel-head">
          <h2>What you can do</h2>
        </div>
        <div className="panel-body">
          <ul className="ticks">
            {ACCESS.filter((item) => can(member, item.permission)).map((item) => (
              <li key={item.permission}>{item.label}</li>
            ))}
          </ul>
          <p className="hint-sm">
            Orders, jobs, team and website screens arrive in the next build phases; they show as &ldquo;Soon&rdquo; in
            the menu.
          </p>
        </div>
      </section>
    </>
  );
}

async function OwnerSummary({ member }: { member: CurrentMember }) {
  const tokens = await getTokenBalance(member.tenant.id);
  return (
    <section className="biz">
      <div className="biz-head">
        <h2>Your business</h2>
      </div>
      <div className="biz-cards">
        <div className={tokens.low ? "biz-card tokens alert" : "biz-card tokens"}>
          <span>AI tokens</span>
          <strong>{formatNumber(tokens.remaining)}</strong>
          <small>
            {tokens.percentLeft}% of {formatNumber(tokens.granted)} left
            {tokens.low ? ": ask your developer for more" : ""}
          </small>
        </div>
      </div>
    </section>
  );
}
