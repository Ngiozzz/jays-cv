import { describe, expect, it } from "vitest";
import { posterPath, posterProblem } from "./poster";

describe("posterProblem", () => {
  it("accepts normal poster images", () => {
    expect(posterProblem({ type: "image/jpeg", size: 300_000 })).toBeNull();
  });

  it("refuses other files, huge files and empty files", () => {
    expect(posterProblem({ type: "application/pdf", size: 1000 })).toMatch(/choose an image/);
    expect(posterProblem({ type: "image/png", size: 7 * 1024 * 1024 })).toMatch(/too large/);
    expect(posterProblem({ type: "image/png", size: 0 })).toMatch(/empty/);
  });
});

describe("posterPath", () => {
  it("files posters under the business and the job", () => {
    expect(posterPath("t1", "job1", "image/webp", "abc")).toBe("t1/job1/abc.webp");
  });
});
