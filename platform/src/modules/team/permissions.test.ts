import { describe, expect, it } from "vitest";
import { assertCan, can, ForbiddenError, type MemberAccess } from "./permissions";

const owner: MemberAccess = { role: "OWNER", status: "ACTIVE", canWrite: true, canPostJobs: true };
const writer: MemberAccess = { role: "WRITER", status: "ACTIVE", canWrite: true, canPostJobs: false };

describe("can", () => {
  it("gives the owner everything", () => {
    expect(can(owner, "seeMoney")).toBe(true);
    expect(can(owner, "manageTeam")).toBe(true);
    expect(can(owner, "reassignOrders")).toBe(true);
  });

  it("never shows money to writers", () => {
    expect(can(writer, "seeMoney")).toBe(false);
    expect(can(writer, "manageFinance")).toBe(false);
    expect(can(writer, "recordPayments")).toBe(false);
  });

  it("lets only the owner reassign or touch other writers' orders", () => {
    expect(can(writer, "reassignOrders")).toBe(false);
    expect(can(writer, "workOnAnyOrder")).toBe(false);
  });

  it("follows the writer's own switches", () => {
    expect(can(writer, "acceptOrders")).toBe(true);
    expect(can(writer, "postJobs")).toBe(false);
    expect(can({ ...writer, canWrite: false, canPostJobs: true }, "acceptOrders")).toBe(false);
    expect(can({ ...writer, canPostJobs: true }, "postJobs")).toBe(true);
  });

  it("blocks paused and removed members, including the owner", () => {
    expect(can({ ...writer, status: "PAUSED" }, "acceptOrders")).toBe(false);
    expect(can({ ...writer, status: "REMOVED" }, "draftCareerTips")).toBe(false);
    expect(can({ ...owner, status: "PAUSED" }, "seeMoney")).toBe(false);
  });
});

describe("assertCan", () => {
  it("throws a ForbiddenError when not allowed", () => {
    expect(() => assertCan(writer, "manageTeam")).toThrow(ForbiddenError);
    expect(() => assertCan(owner, "manageTeam")).not.toThrow();
  });
});
