import { describe, expect, it } from "vitest";
import {
  describeSampleChanges,
  moveInOrder,
  newSampleSchema,
  sampleImagePath,
  sampleImageProblem,
  sampleRowSchema,
  sampleSlug,
  type SampleRow,
} from "./samples";

const accountant: SampleRow = {
  id: "a",
  role: "Accountant",
  tag: "Finance",
  caption: "Shortlisted in 2 weeks",
  published: true,
};

describe("sample rows", () => {
  it("tidies the text and refuses an unknown industry", () => {
    expect(sampleRowSchema.parse({ ...accountant, role: " Accountant " }).role).toBe("Accountant");
    expect(sampleRowSchema.safeParse({ ...accountant, tag: "Farming" }).success).toBe(false);
    expect(newSampleSchema.safeParse({ role: "", tag: "Finance", caption: "x" }).success).toBe(false);
  });

  it("describes each change in plain words", () => {
    const after = { ...accountant, role: "Senior Accountant", published: false };
    expect(describeSampleChanges([accountant], [after])).toEqual([
      '"Accountant" renamed "Senior Accountant"',
      "Senior Accountant unpublished",
    ]);
    expect(describeSampleChanges([accountant], [{ ...accountant }])).toEqual([]);
  });
});

describe("moveInOrder", () => {
  it("swaps a sample with its neighbour, and stops at either end", () => {
    expect(moveInOrder(["a", "b", "c"], "b", "earlier")).toEqual(["b", "a", "c"]);
    expect(moveInOrder(["a", "b", "c"], "b", "later")).toEqual(["a", "c", "b"]);
    expect(moveInOrder(["a", "b", "c"], "a", "earlier")).toEqual(["a", "b", "c"]);
    expect(moveInOrder(["a", "b", "c"], "c", "later")).toEqual(["a", "b", "c"]);
  });
});

describe("sample images", () => {
  it("needs a real image of a sensible size", () => {
    expect(sampleImageProblem({ type: "image/jpeg", size: 200_000 })).toBeNull();
    expect(sampleImageProblem(null)).toBe("Choose the image");
    expect(sampleImageProblem({ type: "application/pdf", size: 1000 })).toMatch(/JPG/);
    expect(sampleImageProblem({ type: "image/png", size: 9_000_000 })).toMatch(/too large/);
  });

  it("names files and addresses so they can't be guessed or clash", () => {
    expect(sampleSlug("Registered Nurse (UK)", "3f9a")).toBe("registered-nurse-uk-3f9a");
    expect(sampleImagePath("t1", "after", "image/png", "abc")).toBe("t1/after-abc.png");
  });
});
