import { describe, expect, it } from "vitest";
import {
  companyInitials,
  daysUntil,
  deadlineLabel,
  displayStatus,
  postedLabel,
  slugify,
  todayInNairobi,
  uniqueSlug,
} from "./jobs.rules";

const today = "2026-10-12";

describe("todayInNairobi", () => {
  it("uses Kenyan time, not the server's", () => {
    // 22:30 UTC on the 11th is already 01:30 on the 12th in Nairobi (UTC+3)
    expect(todayInNairobi(new Date("2026-10-11T22:30:00Z"))).toBe("2026-10-12");
  });
});

describe("daysUntil", () => {
  it("counts calendar days", () => {
    expect(daysUntil("2026-10-15", today)).toBe(3);
    expect(daysUntil("2026-10-11", today)).toBe(-1);
  });
});

describe("displayStatus", () => {
  it("shows drafts as drafts, whatever the deadline", () => {
    expect(displayStatus({ status: "DRAFT", deadline: "2026-01-01" }, today)).toBe("draft");
  });

  it("expires published jobs after their deadline, but not on the day itself", () => {
    expect(displayStatus({ status: "PUBLISHED", deadline: "2026-10-11" }, today)).toBe("expired");
    expect(displayStatus({ status: "PUBLISHED", deadline: today }, today)).toBe("published");
    expect(displayStatus({ status: "PUBLISHED", deadline: null }, today)).toBe("published");
  });
});

describe("deadlineLabel", () => {
  it("warns when a job closes soon", () => {
    expect(deadlineLabel(today, today)).toEqual({ text: "Closes today", tone: "urgent" });
    expect(deadlineLabel("2026-10-13", today)).toEqual({ text: "Closes tomorrow", tone: "urgent" });
    expect(deadlineLabel("2026-10-15", today)).toEqual({ text: "Closes in 3 days", tone: "urgent" });
  });

  it("shows the date otherwise", () => {
    expect(deadlineLabel("2026-11-01", today)).toEqual({ text: "Closes 1 Nov 2026", tone: "" });
    expect(deadlineLabel("2026-10-01", today)).toEqual({ text: "Closed 1 Oct 2026", tone: "closed" });
    expect(deadlineLabel(null, today).text).toBe("Open until filled");
  });
});

describe("postedLabel", () => {
  it("reads naturally", () => {
    expect(postedLabel(today, today)).toBe("Today");
    expect(postedLabel("2026-10-11", today)).toBe("Yesterday");
    expect(postedLabel("2026-10-02", today)).toBe("10 days ago");
  });
});

describe("slugify / uniqueSlug", () => {
  it("makes readable addresses", () => {
    expect(slugify("I.T Specialist", "Kilimall")).toBe("i-t-specialist-kilimall");
    expect(slugify("  ", "")).toBe("job");
  });

  it("never reuses an address", () => {
    expect(uniqueSlug("nurse-avenue", new Set())).toBe("nurse-avenue");
    expect(uniqueSlug("nurse-avenue", new Set(["nurse-avenue", "nurse-avenue-2"]))).toBe("nurse-avenue-3");
  });
});

describe("companyInitials", () => {
  it("takes the first two words", () => {
    expect(companyInitials("Kenya Power & Lighting")).toBe("KP");
    expect(companyInitials("")).toBe("?");
  });
});
