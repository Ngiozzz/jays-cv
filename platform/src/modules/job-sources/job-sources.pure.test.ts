import { describe, expect, it } from "vitest";
import { feedLinks, isFeed, looksLikePdf, pageLinks } from "./discover";
import { robotsAllows } from "./robots";
import { bannedSite, cleanBannedSites, siteName } from "./sites";

describe("banned sites", () => {
  it("names a site from an address or a bare name", () => {
    expect(siteName("https://www.Fuzu.com/jobs?x=1")).toBe("fuzu.com");
    expect(siteName("*.example.co.ke")).toBe("example.co.ke");
    expect(siteName("not a site")).toBeNull();
  });

  it("refuses job boards and their subdomains, and the business's own extra sites", () => {
    expect(bannedSite("https://ke.linkedin.com/jobs/view/1")).toBe("linkedin.com");
    expect(bannedSite("https://www.brightermonday.co.ke/listings")).toBe("brightermonday.co.ke");
    expect(bannedSite("https://careers.kcbgroup.com/")).toBeNull();
    expect(bannedSite("https://jobs.example.com/a", ["example.com"])).toBe("example.com");
    // A name that only ends the same way is not the same site
    expect(bannedSite("https://notfuzu.com/")).toBeNull();
  });

  it("cleans the extra list", () => {
    expect(
      cleanBannedSites(["https://www.Example.com/x", "example.com", "fuzu.com", "rubbish", " other.org "]),
    ).toEqual(["example.com", "other.org"]);
  });
});

describe("robots.txt", () => {
  const robots = [
    "User-agent: *",
    "Disallow: /private/",
    "Allow: /private/jobs/",
    "Disallow: /*.pdf$",
    "",
    "User-agent: BadBot",
    "Disallow: /",
  ].join("\n");

  it("follows the rules for every robot", () => {
    expect(robotsAllows(robots, "https://a.ke/careers")).toBe(true);
    expect(robotsAllows(robots, "https://a.ke/private/staff")).toBe(false);
    // The longer (more specific) rule wins
    expect(robotsAllows(robots, "https://a.ke/private/jobs/1")).toBe(true);
    expect(robotsAllows(robots, "https://a.ke/files/advert.pdf")).toBe(false);
    expect(robotsAllows(robots, "https://a.ke/files/advert.pdf?v=2")).toBe(true);
  });

  it("uses our own group when the site names us", () => {
    const own = "User-agent: *\nDisallow: /\n\nUser-agent: JayCVSJobsBot\nAllow: /careers\nDisallow: /";
    expect(robotsAllows(own, "https://a.ke/careers/1")).toBe(true);
    expect(robotsAllows(own, "https://a.ke/news")).toBe(false);
  });

  it("allows everything when nothing applies or the rule is empty", () => {
    expect(robotsAllows("", "https://a.ke/x")).toBe(true);
    expect(robotsAllows("User-agent: *\nDisallow:", "https://a.ke/x")).toBe(true);
    expect(robotsAllows("User-agent: *\nDisallow: /", "https://a.ke/x")).toBe(false);
  });
});

describe("links on a vacancies page", () => {
  const html = `
    <base href="https://psc.example.ke/">
    <nav><a href="/">Home</a><a href="https://facebook.com/psc">Facebook</a></nav>
    <ul>
      <li><a href="vacancies/senior-accountant">Senior <b>Accountant</b></a> <a href="vacancies/senior-accountant#apply">Read more</a></li>
      <li><a href='/files/advert%20no.%2012.pdf' title="Advert 12">Download</a></li>
      <li><a href="mailto:hr@psc.example.ke">Email us</a></li>
      <li><a href="/logo.png">Logo</a></li>
    </ul>`;

  it("finds each job link once, as a full address, with its words", () => {
    expect(pageLinks(html, "https://psc.example.ke/vacancies")).toEqual([
      { url: "https://psc.example.ke/", text: "Home" },
      { url: "https://psc.example.ke/vacancies/senior-accountant", text: "Senior Accountant" },
      { url: "https://psc.example.ke/files/advert%20no.%2012.pdf", text: "Download" },
    ]);
  });

  it("spots PDFs", () => {
    expect(looksLikePdf("https://a.ke/x/advert.PDF?dl=1")).toBe(true);
    expect(looksLikePdf("https://a.ke/x/advert")).toBe(false);
  });
});

describe("job feeds", () => {
  it("tells a feed from a web page", () => {
    expect(isFeed("application/rss+xml", "")).toBe(true);
    expect(isFeed("text/xml", '<?xml version="1.0"?>\n<rss version="2.0">')).toBe(true);
    expect(isFeed("text/html", "<!doctype html><html>")).toBe(false);
  });

  it("reads RSS items and Atom entries", () => {
    const rss = `<rss><channel><title>Jobs</title>
      <item><title><![CDATA[Programme Officer &amp; Lead]]></title><link>https://reliefweb.int/job/1</link></item>
      <item><title>Driver</title><guid>https://reliefweb.int/job/2</guid></item>
    </channel></rss>`;
    expect(feedLinks(rss, "https://reliefweb.int/jobs/rss.xml")).toEqual([
      { url: "https://reliefweb.int/job/1", text: "Programme Officer & Lead" },
      { url: "https://reliefweb.int/job/2", text: "Driver" },
    ]);
    const atom = `<feed><entry><title>Nurse</title><link rel="alternate" href="/jobs/9"/></entry></feed>`;
    expect(feedLinks(atom, "https://a.ke/feed")).toEqual([{ url: "https://a.ke/jobs/9", text: "Nurse" }]);
  });
});

describe("one spelling per link", () => {
  it("treats the usual variations of a link as the same", async () => {
    const { canonicalUrl } = await import("./discover");
    const same = [
      "https://www.KeNHA.co.ke/careers/engineer/",
      "http://kenha.co.ke/careers/engineer",
      "https://kenha.co.ke/careers/engineer?utm_source=whatsapp&fbclid=abc#apply",
      "https://kenha.co.ke:443/careers/engineer",
    ].map(canonicalUrl);
    expect(new Set(same).size).toBe(1);
    expect(same[0]).toBe("https://kenha.co.ke/careers/engineer");
    // Real differences stay different, and the order of the rest doesn't matter
    expect(canonicalUrl("https://a.ke/job?id=1")).not.toBe(canonicalUrl("https://a.ke/job?id=2"));
    expect(canonicalUrl("https://a.ke/job?b=2&a=1")).toBe(canonicalUrl("https://a.ke/job?a=1&b=2"));
  });
});

describe("sure duplicates", () => {
  it("needs the same company, title and deadline", async () => {
    const { sureDuplicate } = await import("./duplicates");
    const live = [
      { slug: "kcb-teller", title: "Bank Teller", company: "KCB Bank Kenya Ltd", deadline: "2026-11-30" },
      { slug: "nmg-editor", title: "Sub Editor", company: "Nation Media Group", deadline: null },
    ];
    expect(sureDuplicate({ title: "Teller - Bank", company: "KCB Bank", deadline: "2026-11-30" }, live)?.slug).toBe(
      "kcb-teller",
    );
    // Re-advertised with a new deadline: a person decides
    expect(sureDuplicate({ title: "Bank Teller", company: "KCB Bank", deadline: "2026-12-15" }, live)).toBeNull();
    expect(sureDuplicate({ title: "Sub-Editor", company: "Nation Media", deadline: null }, live)?.slug).toBe(
      "nmg-editor",
    );
    expect(sureDuplicate({ title: "Driver", company: "KCB Bank", deadline: "2026-11-30" }, live)).toBeNull();
    expect(sureDuplicate({ title: "", company: "", deadline: null }, live)).toBeNull();
  });
});

describe("different posts in one advert", () => {
  it("keeps Advocate and Non-Advocate apart, but matches the same title written differently", async () => {
    const { sureDuplicate } = await import("./duplicates");
    const waiting = [
      {
        title: "Member, Energy and Petroleum Tribunal (Advocate)",
        company: "Judicial Service Commission",
        deadline: "2026-12-01",
      },
    ];
    const jsc = { company: "Judicial Service Commission", deadline: "2026-12-01" };
    expect(
      sureDuplicate({ ...jsc, title: "Member, Energy and Petroleum Tribunal (Non-Advocate)" }, waiting),
    ).toBeNull();
    expect(sureDuplicate({ ...jsc, title: "MEMBER - Energy & Petroleum Tribunal (Advocate)" }, waiting)).not.toBeNull();
  });
});
