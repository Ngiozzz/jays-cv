import { describe, expect, it } from "vitest";
import { adminTrail } from "./admin-nav";

const trail = (path: string, search = "") => adminTrail(path, new URLSearchParams(search)).map((crumb) => crumb.label);

describe("adminTrail", () => {
  it("starts every page at the Dashboard", () => {
    expect(trail("/admin")).toEqual(["Dashboard"]);
    expect(trail("/admin/team")).toEqual(["Dashboard", "Team"]);
  });

  it("puts Post a job and Bulk post jobs under the Job board", () => {
    expect(trail("/admin/jobs")).toEqual(["Dashboard", "Job board"]);
    expect(trail("/admin/jobs/new")).toEqual(["Dashboard", "Job board", "Post a job"]);
    expect(trail("/admin/inbox")).toEqual(["Dashboard", "Job board", "Bulk post jobs"]);
    expect(trail("/admin/jobs/cm123")).toEqual(["Dashboard", "Job board", "Edit job"]);
    expect(trail("/admin/job-sources/found")).toEqual(["Dashboard", "Job sources", "Jobs found"]);
  });

  it("names the order and the Website content tab", () => {
    expect(trail("/admin/orders/JC-1048")).toEqual(["Dashboard", "Orders", "JC-1048"]);
    expect(trail("/admin/content", "tab=about")).toEqual(["Dashboard", "Website content", "About page"]);
    expect(trail("/admin/content", "tab=nonsense")).toEqual(["Dashboard", "Website content"]);
  });

  it("links each level back to its page", () => {
    expect(adminTrail("/admin/jobs/new", new URLSearchParams()).map((crumb) => crumb.href)).toEqual([
      "/admin",
      "/admin/jobs",
      "/admin/jobs/new",
    ]);
    expect(trail("/admin/profile")).toEqual(["Dashboard", "Your profile"]);
  });
});
