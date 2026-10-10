import { describe, expect, it } from "vitest";
import { isTenantModel, scopeArgs, TENANT_MODELS } from "./tenant-scope";

describe("scopeArgs", () => {
  it("adds the tenant to reads, keeping the caller's filters", () => {
    expect(scopeArgs("findMany", { where: { status: "PAID" }, take: 5 }, "t1")).toEqual({
      where: { status: "PAID", tenantId: "t1" },
      take: 5,
    });
  });

  it("adds the tenant when there is no where clause", () => {
    expect(scopeArgs("count", undefined, "t1")).toEqual({ where: { tenantId: "t1" } });
  });

  it("overrides a tenant id passed by the caller", () => {
    expect(scopeArgs("findFirst", { where: { tenantId: "other" } }, "t1")).toEqual({
      where: { tenantId: "t1" },
    });
  });

  it("scopes updates and deletes by unique key", () => {
    expect(scopeArgs("update", { where: { id: "o1" }, data: { status: "PAID" } }, "t1")).toEqual({
      where: { id: "o1", tenantId: "t1" },
      data: { status: "PAID" },
    });
    expect(scopeArgs("delete", { where: { id: "o1" } }, "t1")).toEqual({
      where: { id: "o1", tenantId: "t1" },
    });
  });

  it("stamps the tenant on created rows", () => {
    expect(scopeArgs("create", { data: { name: "Faq", tenantId: "other" } }, "t1")).toEqual({
      data: { name: "Faq", tenantId: "t1" },
    });
    expect(scopeArgs("createMany", { data: [{ a: 1 }, { a: 2 }] }, "t1")).toEqual({
      data: [
        { a: 1, tenantId: "t1" },
        { a: 2, tenantId: "t1" },
      ],
    });
  });

  it("scopes both sides of an upsert", () => {
    expect(scopeArgs("upsert", { where: { id: "x" }, create: { a: 1 }, update: { a: 2 } }, "t1")).toEqual({
      where: { id: "x", tenantId: "t1" },
      create: { a: 1, tenantId: "t1" },
      update: { a: 2 },
    });
  });

  it("refuses operations it does not know how to scope", () => {
    expect(() => scopeArgs("$queryRaw", {}, "t1")).toThrow(/not allowed/);
  });
});

describe("isTenantModel", () => {
  it("knows business tables from shared ones", () => {
    expect(isTenantModel("Order")).toBe(true);
    expect(isTenantModel("User")).toBe(false);
    expect(isTenantModel("Tenant")).toBe(false);
  });
});

describe("TENANT_MODELS", () => {
  it("lists exactly the schema models that have a tenantId column", async () => {
    const { readFile } = await import("node:fs/promises");
    const schema = await readFile("prisma/schema.prisma", "utf8");
    const models = [...schema.matchAll(/^model (\w+) \{([\s\S]*?)^\}/gm)]
      .filter(([, , body]) => /^\s+tenantId\s/m.test(body))
      .map(([, name]) => name)
      .sort();
    expect(models).toEqual([...TENANT_MODELS].sort());
  });
});
