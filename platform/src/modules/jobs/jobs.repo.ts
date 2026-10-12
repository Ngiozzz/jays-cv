import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { tenantDb } from "@/lib/tenant-db";

const listFields = {
  id: true,
  slug: true,
  title: true,
  company: true,
  location: true,
  category: true,
  status: true,
  deadline: true,
  postedAt: true,
} as const;

export function findJobsForList(tenantId: string) {
  return tenantDb(tenantId).job.findMany({ select: listFields, orderBy: { postedAt: "desc" } });
}

export type JobListRow = Awaited<ReturnType<typeof findJobsForList>>[number];

export function findJob(tenantId: string, id: string) {
  return tenantDb(tenantId).job.findUnique({ where: { id } });
}

export async function findSlugsStartingWith(tenantId: string, base: string): Promise<Set<string>> {
  const rows = await tenantDb(tenantId).job.findMany({
    where: { slug: { startsWith: base } },
    select: { slug: true },
  });
  return new Set(rows.map((row) => row.slug));
}

// tenantId is stamped by tenantDb; it's listed here only to satisfy Prisma's types
export function createJob(tenantId: string, data: Omit<Prisma.JobUncheckedCreateInput, "tenantId">) {
  return tenantDb(tenantId).job.create({ data: { ...data, tenantId } });
}

export function updateJob(tenantId: string, id: string, data: Prisma.JobUncheckedUpdateInput) {
  return tenantDb(tenantId).job.update({ where: { id }, data });
}

export function deleteJob(tenantId: string, id: string) {
  return tenantDb(tenantId).job.delete({ where: { id } });
}

export function findPosters(tenantId: string, jobId: string) {
  return tenantDb(tenantId).storedFile.findMany({
    where: { jobId, kind: "JOB_POSTER", deletedAt: null },
    orderBy: { createdAt: "desc" },
  });
}

export function createPosterRecord(
  tenantId: string,
  poster: { jobId: string; storagePath: string; name: string; mimeType: string; sizeBytes: number; uploadedBy: string },
) {
  return tenantDb(tenantId).storedFile.create({ data: { ...poster, tenantId, kind: "JOB_POSTER" } });
}

export function deleteFileRecords(tenantId: string, ids: string[]) {
  return tenantDb(tenantId).storedFile.deleteMany({ where: { id: { in: ids } } });
}

// Published jobs for the public board, with their latest poster
const publicFields = {
  slug: true,
  title: true,
  company: true,
  location: true,
  workMode: true,
  type: true,
  category: true,
  salary: true,
  summary: true,
  responsibilities: true,
  requirements: true,
  deadline: true,
  postedAt: true,
  apply: true,
  source: true,
  files: {
    where: { kind: "JOB_POSTER", deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: 1,
    select: { storagePath: true },
  },
} as const;

export function findPublishedJobs(tenantId: string) {
  return tenantDb(tenantId).job.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { postedAt: "desc" },
    select: publicFields,
  });
}

export function findPublishedJobBySlug(tenantId: string, slug: string) {
  return tenantDb(tenantId).job.findFirst({ where: { status: "PUBLISHED", slug }, select: publicFields });
}

export type PublishedJobRow = Awaited<ReturnType<typeof findPublishedJobs>>[number];
