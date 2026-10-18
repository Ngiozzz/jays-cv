import { describe, expect, it } from "vitest";
import { callerKind, command, tokensToRemove, usageEntry, usageQuery } from "./messages";

describe("callerKind", () => {
  it("names the kind of caller, never the person", () => {
    expect(callerKind({ memberId: "m1", feature: "Poster reading" })).toBe("team");
    expect(callerKind({ memberId: null, feature: "CV check" })).toBe("visitor");
    expect(callerKind({ memberId: null, feature: "Review screening" })).toBe("automatic");
  });
});

describe("usageEntry", () => {
  it("sends numbers only, without the member, order or note", () => {
    const entry = usageEntry({
      seq: 7,
      createdAt: new Date("2026-10-18T10:00:00Z"),
      kind: "USAGE",
      feature: "Poster reading",
      model: "claude-haiku-5-5",
      inputTokens: 900,
      outputTokens: 100,
      delta: -1000,
      memberId: "m1",
    });
    expect(entry).toEqual({
      seq: 7,
      at: "2026-10-18T10:00:00.000Z",
      kind: "USAGE",
      feature: "Poster reading",
      model: "claude-haiku-5-5",
      inputTokens: 900,
      outputTokens: 100,
      delta: -1000,
      caller: "team",
    });
  });
});

describe("usageQuery", () => {
  it("defaults to the start and caps the page size", () => {
    expect(usageQuery.parse({})).toEqual({ after: 0, limit: 500 });
    expect(usageQuery.safeParse({ limit: "5000" }).success).toBe(false);
  });
});

describe("command", () => {
  it("accepts the known commands and refuses anything else", () => {
    expect(command.safeParse({ id: "cmd_12345678", type: "add_tokens", tokens: 1_000_000 }).success).toBe(true);
    expect(command.safeParse({ id: "cmd_12345678", type: "set_ai_paused", paused: true }).success).toBe(true);
    expect(command.safeParse({ id: "cmd_12345678", type: "add_tokens", tokens: -5 }).success).toBe(false);
    expect(command.safeParse({ id: "cmd_12345678", type: "remove_tokens", tokens: 500 }).success).toBe(true);
    expect(command.safeParse({ id: "cmd_12345678", type: "delete_business" }).success).toBe(false);
  });
});

describe("tokensToRemove", () => {
  it("never takes the balance below zero", () => {
    expect(tokensToRemove(1000, 5000)).toBe(1000);
    expect(tokensToRemove(9000, 5000)).toBe(5000);
    expect(tokensToRemove(1000, 0)).toBe(0);
    expect(tokensToRemove(1000, -20)).toBe(0);
  });
});
