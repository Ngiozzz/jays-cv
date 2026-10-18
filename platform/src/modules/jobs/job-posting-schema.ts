// Google for Jobs reads this from each job page (schema.org JobPosting), so Jay CVS jobs can
// appear in Google's job search. Pure, so it's unit-tested.

import { OUTSIDE_KENYA, isCounty } from "./counties";

type JobForGoogle = {
  title: string;
  company: string;
  counties: string[];
  town: string;
  country: string;
  workMode: string;
  type: string;
  summary: string;
  responsibilities: string[];
  requirements: string[];
  deadline: string | null;
  postedDay: string;
};

const EMPLOYMENT_TYPE: Record<string, string> = {
  "Full-time": "FULL_TIME",
  "Part-time": "PART_TIME",
  Contract: "CONTRACTOR",
  "Graduate / Internship": "INTERN",
  Volunteer: "VOLUNTEER",
};

const listHtml = (title: string, items: string[]) =>
  items.length
    ? `<p><strong>${title}</strong></p><ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
    : "";

function escapeHtml(text: string): string {
  return text.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c,
  );
}

// Each county the job is in becomes a place (with the town when there's only one county). Nationwide
// and "Not specified" jobs only give the country; jobs abroad give their city and country.
function jobLocation(job: JobForGoogle) {
  const place = (address: Record<string, string>) => ({
    "@type": "Place",
    address: { "@type": "PostalAddress", ...address },
  });
  if (job.counties[0] === OUTSIDE_KENYA) {
    return place({ ...(job.town ? { addressLocality: job.town } : {}), addressCountry: job.country || "KE" });
  }
  const counties = job.counties.filter(isCounty);
  if (!counties.length) return place({ addressCountry: "KE" });
  const places = counties.map((county) =>
    place({
      ...(job.town && counties.length === 1 ? { addressLocality: job.town } : {}),
      addressRegion: `${county} County`,
      addressCountry: "KE",
    }),
  );
  return places.length === 1 ? places[0] : places;
}

export function jobPostingSchema(job: JobForGoogle, pageUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description:
      `<p>${escapeHtml(job.summary || job.title)}</p>` +
      listHtml("Responsibilities", job.responsibilities) +
      listHtml("Requirements", job.requirements),
    datePosted: job.postedDay,
    ...(job.deadline ? { validThrough: `${job.deadline}T23:59:59+03:00` } : {}),
    employmentType: EMPLOYMENT_TYPE[job.type] ?? "OTHER",
    hiringOrganization: { "@type": "Organization", name: job.company },
    jobLocation: jobLocation(job),
    ...(job.workMode === "Remote"
      ? { jobLocationType: "TELECOMMUTE", applicantLocationRequirements: { "@type": "Country", name: "Kenya" } }
      : {}),
    url: pageUrl,
  };
}

// For a <script type="application/ld+json"> tag: "<" is escaped so job text can never close the tag early
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
