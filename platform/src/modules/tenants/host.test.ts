import { describe, expect, it } from "vitest";
import { domainFromHost } from "./host";

describe("domainFromHost", () => {
  it("drops the port and www", () => {
    expect(domainFromHost("www.JayCVS.co.ke:443")).toBe("jaycvs.co.ke");
    expect(domainFromHost("localhost:3000")).toBe("localhost");
  });

  it("returns null without a host", () => {
    expect(domainFromHost(null)).toBeNull();
    expect(domainFromHost("")).toBeNull();
  });
});
