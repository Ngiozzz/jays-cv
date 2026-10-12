import type { Metadata } from "next";
import { NotAllowed } from "@/components/admin/NotAllowed";
import { CompanyLogoRow } from "@/components/admin/jobs/CompanyLogoRow";
import { Icon } from "@/components/icons/Icon";
import { coverageOf, listCompanies } from "@/modules/jobs/companies.service";
import { requireMember } from "@/modules/team/current-member";
import { can } from "@/modules/team/permissions";

export const metadata: Metadata = { title: "Company logos" };

export default async function CompanyLogosPage() {
  const member = await requireMember();
  if (!can(member, "postJobs")) return <NotAllowed what="company logos" />;
  // Companies whose jobs were all deleted only clutter the list, unless they still have a logo saved
  const companies = (await listCompanies(member)).filter((company) => company.jobCount > 0 || company.logoUrl);
  const coverage = coverageOf(companies);

  return (
    <>
      <div className="stat-grid">
        <div className="stat-card">
          <span className="icon-box">
            <Icon name="building" />
          </span>
          <div>
            <strong>{coverage.companies}</strong>
            <span>Hiring companies</span>
          </div>
        </div>
        <div className="stat-card">
          <span className="icon-box">
            <Icon name="image" />
          </span>
          <div>
            <strong>{coverage.withLogo}</strong>
            <span>Have a logo</span>
          </div>
        </div>
        <div className="stat-card">
          <span className="icon-box">
            <Icon name="check" />
          </span>
          <div>
            <strong>{coverage.jobsCoveredPct}%</strong>
            <span>Of jobs show a logo</span>
          </div>
        </div>
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Company logos</h2>
            <p className="panel-sub">
              Companies that post the most jobs are listed first: adding their logos makes the biggest difference.
              Companies without a logo show their initials.
            </p>
          </div>
        </div>
        <div className="table-wrap-admin">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Jobs</th>
                <th>Logo</th>
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {companies.length ? (
                companies.map((company) => <CompanyLogoRow key={company.id} {...company} />)
              ) : (
                <tr>
                  <td colSpan={4} className="table-empty">
                    Companies appear here once you post their jobs.
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
