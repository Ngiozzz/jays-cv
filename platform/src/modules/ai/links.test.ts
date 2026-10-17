import { describe, expect, it } from "vitest";
import { findLinks, htmlToText, leavingLinkedInTarget, siteOf } from "./links";
import { isPrivateAddress } from "./link-reader";

describe("findLinks", () => {
  it("finds each link once, without trailing punctuation", () => {
    const caption =
      "Associate II: System Support Analyst: https://lnkd.in/dAgn9b8i\nRisk (https://lnkd.in/emWATGb7). Again: https://lnkd.in/dAgn9b8i.";
    expect(findLinks(caption)).toEqual(["https://lnkd.in/dAgn9b8i", "https://lnkd.in/emWATGb7"]);
  });

  it("finds nothing in plain text", () => {
    expect(findLinks("Send your CV to jobs@example.co.ke")).toEqual([]);
  });
});

describe("htmlToText", () => {
  it("keeps the readable text, one block per line, and drops scripts and styles", () => {
    const html =
      "<html><head><style>p{color:red}</style><script>alert(1)</script></head><body><h1>Support Analyst</h1><p>Reporting to the Head &amp; team</p><ul><li>Second line support</li><li>User accounts</li></ul></body></html>";
    expect(htmlToText(html)).toBe(
      "Support Analyst\nReporting to the Head & team\n• Second line support\n• User accounts",
    );
  });
});

describe("leavingLinkedInTarget", () => {
  it("finds the real address on LinkedIn's 'you're leaving' page", () => {
    const html =
      '<link href="https://static.licdn.com/aero-v1/x"><a href="https://www.linkedin.com/help">Help</a><a href="https://career55.sapsf.eu/sfcareer/jobreqcareer?jobId=776&amp;company=icealionli">Continue</a>';
    expect(leavingLinkedInTarget(html)).toBe(
      "https://career55.sapsf.eu/sfcareer/jobreqcareer?jobId=776&company=icealionli",
    );
    expect(leavingLinkedInTarget('<a href="https://lnkd.in/x">x</a>')).toBeNull();
  });
});

describe("siteOf", () => {
  it("shows the site's name", () => {
    expect(siteOf("https://www.example.co.ke/careers/1")).toBe("example.co.ke");
  });
});

describe("isPrivateAddress", () => {
  it("refuses the server's own and private networks, allows the public internet", () => {
    for (const address of [
      "127.0.0.1",
      "10.1.2.3",
      "192.168.1.1",
      "172.20.0.1",
      "169.254.169.254",
      "::1",
      "fd00::1",
      "::ffff:127.0.0.1",
    ]) {
      expect(isPrivateAddress(address)).toBe(true);
    }
    for (const address of ["8.8.8.8", "41.90.64.1", "2a00:1450:4001::200e"]) {
      expect(isPrivateAddress(address)).toBe(false);
    }
  });
});
