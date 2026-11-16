import { describe, expect, it } from "vitest";
import { careersLink, employerSite, isVacanciesSite, sameEmployerSite, sourceNameFor, suggestSources } from "./suggest";

describe("employer websites from posted jobs", () => {
  it("uses the apply link's site, or the email's domain", () => {
    expect(
      employerSite({ company: "M.P. Shah", apply: { method: "link", url: "https://recruitment.mpshahhosp.org" } }),
    ).toEqual({
      site: "recruitment.mpshahhosp.org",
      start: "https://recruitment.mpshahhosp.org/",
    });
    expect(
      employerSite({ company: "Kilimall", apply: { method: "email", email: "recruitment@Kilimall.com" } }),
    ).toEqual({
      site: "kilimall.com",
      start: "https://kilimall.com/",
    });
  });

  it("skips free email, forms and shared hiring systems, but keeps a company's own board", () => {
    expect(employerSite({ company: "X", apply: { method: "email", email: "hr.jobs@gmail.com" } })).toBeNull();
    expect(employerSite({ company: "X", apply: { method: "link", url: "https://forms.gle/abc" } })).toBeNull();
    expect(
      employerSite({
        company: "ICEA",
        apply: { method: "link", url: "https://career55.sapsf.eu/sfcareer/jobreqcareer?jobId=1" },
      }),
    ).toBeNull();
    expect(employerSite({ company: "Acme", apply: { method: "link", url: "https://jobs.lever.co/acme/123" } })).toEqual(
      {
        site: "jobs.lever.co/acme",
        start: "https://jobs.lever.co/acme",
      },
    );
    expect(employerSite({ company: "X", apply: { method: "phone" } })).toBeNull();
  });

  it("groups by site, most-posted first, with the usual company name", () => {
    const jobs = [
      { company: "Kilimall", apply: { method: "email", email: "a@kilimall.com" } },
      { company: "Kilimall Kenya", apply: { method: "email", email: "b@kilimall.com" } },
      { company: "Kilimall", apply: { method: "email", email: "c@kilimall.com" } },
      { company: "Karen Hospital", apply: { method: "email", email: "hr@karenhospital.org" } },
      { company: "KRA", apply: { method: "link", url: "https://www.kra.go.ke/careers/1" } },
    ];
    expect(suggestSources(jobs, (site) => site === "kra.go.ke")).toEqual([
      { site: "kilimall.com", start: "https://kilimall.com/", company: "Kilimall", jobs: 3 },
      { site: "karenhospital.org", start: "https://karenhospital.org/", company: "Karen Hospital", jobs: 1 },
    ]);
  });
});

describe("finding the careers page", () => {
  const home = "https://www.example.co.ke/";
  it("picks the vacancies link, not news, tenders or one dated post", () => {
    const links = [
      { url: "https://www.example.co.ke/about", text: "About us" },
      { url: "https://www.example.co.ke/tenders", text: "Tenders" },
      { url: "https://www.example.co.ke/2026/10/20/accountant-vacancy/", text: "Accountant vacancy" },
      { url: "https://www.example.co.ke/news/jobs-initiative", text: "Our jobs initiative" },
      { url: "https://www.example.co.ke/careers/", text: "Careers" },
      { url: "https://other.com/careers", text: "Careers" },
    ];
    expect(careersLink(links, home)?.url).toBe("https://www.example.co.ke/careers/");
    expect(careersLink([{ url: "https://www.example.co.ke/about", text: "About" }], home)).toBeNull();
  });

  it("accepts the company's hiring subdomain", () => {
    expect(careersLink([{ url: "https://careers.example.co.ke/", text: "Join us" }], home)?.url).toBe(
      "https://careers.example.co.ke/",
    );
    expect(sameEmployerSite("https://careers.kcbgroup.com/x", "https://kcbgroup.com")).toBe(true);
    expect(sameEmployerSite("https://kcbgroup.com", "https://ncbagroup.com")).toBe(false);
    expect(isVacanciesSite("https://recruitment.mpshahhosp.org/")).toBe(true);
    expect(isVacanciesSite("https://mpshahhosp.org/")).toBe(false);
  });

  it("names the source", () => {
    expect(sourceNameFor("Kilimall")).toBe("Kilimall careers");
    expect(sourceNameFor("KRA Careers")).toBe("KRA Careers");
  });
});

describe("HR agencies", () => {
  it("doesn't take a 'recruitment services' sales page for vacancies", () => {
    const home = "https://www.powervision.co.ke/";
    const links = [
      { url: "https://powervision.co.ke/service/recruitment-and-selection/", text: "Recruitment and Selection" },
    ];
    expect(careersLink(links, home)).toBeNull();
  });
});
