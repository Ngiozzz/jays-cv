// Google for Jobs reads this from each job page (schema.org JobPosting), so Jay CVS jobs can
// appear in Google's job search. Pure, so it's unit-tested.

type JobForGoogle = {
  title: string;
  company: string;
  location: string;
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
    jobLocation: {
      "@type": "Place",
      address: { "@type": "PostalAddress", addressLocality: job.location, addressCountry: "KE" },
    },
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
