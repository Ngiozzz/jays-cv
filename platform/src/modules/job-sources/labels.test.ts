import { describe, expect, it } from "vitest";
import { checkedLabel, checkSummary } from "./labels";

describe("last checked", () => {
  // 16 Nov 2026, 19:00 in Nairobi (UTC+3)
  const now = new Date("2026-11-16T16:00:00Z");

  it("says today, yesterday or how many days ago, in Nairobi time", () => {
    expect(checkedLabel(null, now)).toBe("Never");
    expect(checkedLabel("2026-11-16T02:00:00Z", now)).toBe("Today 05:00");
    // 23:30 UTC on the 15th is already the 16th in Nairobi
    expect(checkedLabel("2026-11-15T23:30:00Z", now)).toBe("Today 02:30");
    expect(checkedLabel("2026-11-15T02:01:00Z", now)).toBe("Yesterday 05:01");
    expect(checkedLabel("2026-11-13T02:00:00Z", now)).toBe("3 days ago");
  });
});

describe("check summary", () => {
  it("explains what was found", () => {
    expect(checkSummary({ found: 0, added: 0, waiting: 0 })).toMatch(/^No new jobs/);
    expect(checkSummary({ found: 1, added: 1, waiting: 0 })).toBe(
      "Found 1 new job: 1 added to Bulk post, where the AI reads it for you to check.",
    );
    expect(checkSummary({ found: 25, added: 20, waiting: 5 })).toContain("5 more will be added tomorrow");
  });
});
