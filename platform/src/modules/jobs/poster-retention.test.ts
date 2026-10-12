import { describe, expect, it } from "vitest";
import { closedOn, monthsBefore, posterExpired } from "./poster-retention";

const today = "2026-10-12";

describe("monthsBefore", () => {
  it("counts back calendar months", () => {
    expect(monthsBefore(today, 3)).toBe("2026-07-12");
    expect(monthsBefore("2026-01-15", 1)).toBe("2025-12-15");
  });
});

describe("closedOn", () => {
  it("uses the deadline once it has passed", () => {
    expect(closedOn({ status: "PUBLISHED", deadline: "2026-06-01", updatedDay: "2026-05-01" }, today)).toBe(
      "2026-06-01",
    );
  });

  it("treats live jobs as open, whatever their age", () => {
    expect(closedOn({ status: "PUBLISHED", deadline: "2026-12-01", updatedDay: "2026-01-01" }, today)).toBeNull();
    expect(closedOn({ status: "PUBLISHED", deadline: null, updatedDay: "2025-01-01" }, today)).toBeNull();
  });

  it("closes open-ended jobs on the day they were taken down", () => {
    expect(closedOn({ status: "DRAFT", deadline: null, updatedDay: "2026-03-03" }, today)).toBe("2026-03-03");
  });
});

describe("posterExpired", () => {
  it("keeps posters for the retention period after closing, then lets them go", () => {
    const job = (deadline: string) => ({ status: "PUBLISHED", deadline, updatedDay: "2026-01-01" });
    expect(posterExpired(job("2026-08-01"), today, 3)).toBe(false);
    expect(posterExpired(job("2026-07-01"), today, 3)).toBe(true);
  });
});
