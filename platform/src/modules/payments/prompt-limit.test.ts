import { describe, expect, it } from "vitest";
import {
  PHONE_DAY_LIMIT,
  PHONE_LIMIT,
  promptLimitProblem,
  promptPhoneKey,
  promptVisitorKey,
  VISITOR_LIMIT,
} from "./prompt-limit";

const none = { phoneRecent: 0, phoneToday: 0, visitorRecent: 0 };

describe("the M-Pesa prompt limit", () => {
  it("lets a prompt go under every limit", () => {
    expect(promptLimitProblem(none, true)).toBeNull();
    expect(
      promptLimitProblem(
        { phoneRecent: PHONE_LIMIT.count - 1, phoneToday: PHONE_DAY_LIMIT - 1, visitorRecent: VISITOR_LIMIT.count - 1 },
        true,
      ),
    ).toBeNull();
  });

  it("stops prompt after prompt to one phone", () => {
    expect(promptLimitProblem({ ...none, phoneRecent: PHONE_LIMIT.count }, true)).toContain("Wait 10 minutes");
  });

  it("stops a phone for the day once it has had too many", () => {
    expect(promptLimitProblem({ ...none, phoneRecent: 3, phoneToday: PHONE_DAY_LIMIT }, true)).toContain("tomorrow");
  });

  it("stops one visitor typing number after number", () => {
    expect(promptLimitProblem({ ...none, visitorRecent: VISITOR_LIMIT.count }, true)).toContain("from here");
  });

  it("only offers the Paybill where there is one", () => {
    expect(promptLimitProblem({ ...none, phoneRecent: 3 }, true)).toContain("pay by Paybill");
    expect(promptLimitProblem({ ...none, phoneRecent: 3 }, false)).not.toContain("Paybill");
  });

  it("never keeps the internet address itself", () => {
    const key = promptVisitorKey("196.201.214.10");
    expect(key).toMatch(/^prompt:[0-9a-f]{32}$/);
    expect(key).not.toContain(".");
    expect(promptVisitorKey("196.201.214.10")).toBe(key);
  });

  it("counts a phone by a hash of its number, apart from visitors", () => {
    const key = promptPhoneKey("254712345678");
    expect(key).toMatch(/^prompt-phone:[0-9a-f]{32}$/);
    expect(promptPhoneKey("254712345678")).toBe(key);
    expect(promptPhoneKey("254712345679")).not.toBe(key);
  });
});
