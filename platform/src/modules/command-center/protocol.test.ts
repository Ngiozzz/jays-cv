import { describe, expect, it } from "vitest";
import { CC_HEADERS, MAX_AGE_MS, signedHeaders, verify, type IncomingRequest } from "./protocol";

const KEY = "test-key-for-jaycvs";
const NOW = 1_760_000_000_000;
const getKey = async (business: string) => (business === "jaycvs" ? KEY : null);

function request(headers: Record<string, string>, overrides: Partial<IncomingRequest> = {}): IncomingRequest {
  return {
    method: "POST",
    pathWithQuery: "/api/command-center/v1/commands",
    body: '{"type":"add_tokens"}',
    header: (name) => headers[name] ?? null,
    ...overrides,
  };
}

function signed(business = "jaycvs", key = KEY, at = NOW) {
  return signedHeaders(
    key,
    { method: "POST", pathWithQuery: "/api/command-center/v1/commands", business, body: '{"type":"add_tokens"}' },
    at,
  );
}

describe("command center protocol", () => {
  it("accepts a correctly signed request", async () => {
    expect(await verify(request(signed()), getKey, NOW)).toEqual({ ok: true, business: "jaycvs" });
  });

  it("refuses a request with no signature", async () => {
    const headers = signed();
    delete headers[CC_HEADERS.signature];
    expect(await verify(request(headers), getKey, NOW)).toEqual({ ok: false, reason: "missing" });
  });

  it("refuses a request older than 5 minutes", async () => {
    const result = await verify(request(signed()), getKey, NOW + MAX_AGE_MS + 1);
    expect(result).toEqual({ ok: false, reason: "stale" });
  });

  it("refuses a changed body, path or method", async () => {
    const headers = signed();
    for (const change of [
      { body: '{"type":"add_tokens","tokens":999}' },
      { pathWithQuery: "/api/command-center/v1/usage" },
      { method: "GET" },
    ]) {
      expect(await verify(request(headers, change), getKey, NOW)).toEqual({ ok: false, reason: "bad_signature" });
    }
  });

  it("refuses the wrong key and an unknown business the same way", async () => {
    expect(await verify(request(signed("jaycvs", "wrong-key")), getKey, NOW)).toEqual({
      ok: false,
      reason: "bad_signature",
    });
    expect(await verify(request(signed("nobody")), getKey, NOW)).toEqual({ ok: false, reason: "bad_signature" });
  });
});
