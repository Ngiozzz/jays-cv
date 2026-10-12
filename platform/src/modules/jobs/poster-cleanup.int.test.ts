import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { cleanUpOldPosters } from "./poster-cleanup.service";

// A throwaway business with one long-closed job and one live job, each with a poster record
const run = Date.now();
let tenantId = "";

beforeAll(async () => {
  const tenant = await db.tenant.create({
    data: {
      slug: `cleanup-${run}`,
      name: "Cleanup test",
      settings: {
        create: { whatsapp: "0700000000", email: "x@test", address: "x", paybill: "1", posterRetentionMonths: 3 },
      },
    },
  });
  tenantId = tenant.id;
  const job = (title: string, deadline: string) =>
    db.job.create({
      data: {
        tenantId,
        slug: title,
        title,
        company: "Co",
        location: "Nairobi",
        workMode: "On-site",
        type: "Full-time",
        category: "",
        summary: "",
        apply: {},
        status: "PUBLISHED",
        deadline: new Date(`${deadline}T00:00:00Z`),
      },
    });
  const old = await job("old-job", "2026-01-31");
  const live = await job("live-job", "2026-12-31");
  for (const [j, name] of [
    [old, "old"],
    [live, "live"],
  ] as const) {
    await db.storedFile.create({
      data: {
        tenantId,
        jobId: j.id,
        kind: "JOB_POSTER",
        name,
        mimeType: "image/jpeg",
        sizeBytes: 1,
        storagePath: `${tenantId}/${name}-${run}.jpg`,
        uploadedBy: "test",
      },
    });
  }
});

afterAll(async () => {
  await db.tenant.delete({ where: { id: tenantId } });
  await db.$disconnect();
});

describe("cleanUpOldPosters", () => {
  it("deletes posters of long-closed jobs and keeps live ones", async () => {
    const results = await cleanUpOldPosters(new Date("2026-10-12T09:00:00Z"));
    expect(results.find((r) => r.tenant === `cleanup-${run}`)).toEqual({ tenant: `cleanup-${run}`, deleted: 1 });
    const left = await db.storedFile.findMany({ where: { tenantId }, select: { name: true } });
    expect(left).toEqual([{ name: "live" }]);
  });
});
