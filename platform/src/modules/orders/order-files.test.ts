import { describe, expect, it } from "vitest";
import { fileSize, fileUrl, groupFiles, type OrderFileRecord } from "./order-files";

const file = (id: string, patch: Partial<OrderFileRecord>): OrderFileRecord => ({
  id,
  kind: "DRAFT",
  version: null,
  name: `${id}.docx`,
  sizeBytes: 48_000,
  note: null,
  createdAt: new Date("2026-10-14T08:00:00Z"),
  ...patch,
});

describe("groupFiles", () => {
  it("splits the client's files from ours, newest first, with their notes", () => {
    const { fromClient, fromUs } = groupFiles([
      file("cv", { kind: "CURRENT_CV" }),
      file("v1", { version: 1, createdAt: new Date("2026-10-14T10:00:00Z") }),
      file("v2", { version: 2, note: "Shortened page 2", createdAt: new Date("2026-10-14T12:00:00Z") }),
      file("advert", { kind: "JOB_ADVERT" }),
    ]);
    expect(fromClient.map((f) => f.label)).toEqual(["Current CV", "Job advert"]);
    expect(fromUs.map((f) => [f.label, f.note])).toEqual([
      ["Draft v2", "Shortened page 2"],
      ["Draft v1", null],
    ]);
  });

  it("links files only through the checked route", () => {
    expect(fileUrl("abc")).toBe("/api/order-files/abc");
    expect(fileUrl("abc", true)).toBe("/api/order-files/abc?download");
    expect(fileSize(48_000)).toBe("47 KB");
    expect(fileSize(3_500_000)).toBe("3.3 MB");
  });
});
