import { describe, expect, it } from "vitest";
import { bulkFileProblem } from "./poster";

describe("bulkFileProblem", () => {
  it("takes poster images and PDF adverts", () => {
    expect(bulkFileProblem({ type: "image/jpeg", size: 300_000 })).toBeNull();
    expect(bulkFileProblem({ type: "application/pdf", size: 900_000 })).toBeNull();
  });

  it("refuses a PDF too big to upload, or an empty one", () => {
    expect(bulkFileProblem({ type: "application/pdf", size: 5_000_000 })).toMatch(/under 4 MB/);
    expect(bulkFileProblem({ type: "application/pdf", size: 0 })).toMatch(/empty/);
  });

  it("still refuses other files", () => {
    expect(bulkFileProblem({ type: "application/msword", size: 10_000 })).toMatch(/image/);
  });
});
