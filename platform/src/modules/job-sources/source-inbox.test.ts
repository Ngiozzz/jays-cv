import { describe, expect, it } from "vitest";
import { groupOf, matchesSearch, readStateOf } from "./source-inbox";

const day = (n: number) => new Date(Date.UTC(2026, 10, n));

describe("readStateOf", () => {
  const finds = [{ createdAt: day(10) }, { createdAt: day(20) }, { createdAt: day(22) }];

  it("counts what was found since the source was last opened", () => {
    expect(readStateOf({ readAt: day(15), markedUnread: false }, finds)).toEqual({ unread: true, newCount: 2 });
  });

  it("is read once opened after its last find", () => {
    expect(readStateOf({ readAt: day(23), markedUnread: false }, finds)).toEqual({ unread: false, newCount: 0 });
  });

  it("counts everything for a source never opened", () => {
    expect(readStateOf({ readAt: null, markedUnread: false }, finds).newCount).toBe(3);
  });

  it("shows as unread when marked by hand, even with nothing new", () => {
    expect(readStateOf({ readAt: day(23), markedUnread: true }, finds)).toEqual({ unread: true, newCount: 0 });
  });

  it("is read when it never found anything", () => {
    expect(readStateOf({ readAt: null, markedUnread: false }, []).unread).toBe(false);
  });
});

describe("groupOf", () => {
  it("puts new finds first, then problems, then the rest", () => {
    expect(groupOf({ unread: true, enabled: false, lastError: "down" })).toBe("unread");
    expect(groupOf({ unread: false, enabled: true, lastError: "down" })).toBe("attention");
    expect(groupOf({ unread: false, enabled: false, lastError: null })).toBe("attention");
    expect(groupOf({ unread: false, enabled: true, lastError: null })).toBe("rest");
  });
});

describe("matchesSearch", () => {
  it("matches every word against the name and website", () => {
    const kra = { name: "KRA careers", site: "kra.go.ke" };
    expect(matchesSearch(kra, "kra")).toBe(true);
    expect(matchesSearch(kra, "careers go.ke")).toBe(true);
    expect(matchesSearch(kra, "kcb")).toBe(false);
    expect(matchesSearch(kra, "  ")).toBe(true);
  });
});
