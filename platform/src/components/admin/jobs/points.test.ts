import { describe, expect, it } from "vitest";
import { splitPoints } from "./points";

describe("splitPoints", () => {
  it("splits a pasted list and drops its bullets and numbers", () => {
    expect(splitPoints("• Prepare reports\n- Keep the ledger\n3. Pay suppliers\nb) File returns\n\n")).toEqual([
      "Prepare reports",
      "Keep the ledger",
      "Pay suppliers",
      "File returns",
    ]);
  });

  it("keeps a single line as it is", () => {
    expect(splitPoints("Degree in Accounting")).toEqual(["Degree in Accounting"]);
  });

  it("doesn't cut words that start like a list letter", () => {
    expect(splitPoints("A degree in IT\nIT support experience")).toEqual(["A degree in IT", "IT support experience"]);
  });
});
