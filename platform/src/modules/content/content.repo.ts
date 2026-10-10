import "server-only";
import { tenantDb } from "@/lib/tenant-db";

const bySortOrder = { sortOrder: "asc" } as const;

export function findSettings(tenantId: string) {
  return tenantDb(tenantId).businessSettings.findFirstOrThrow();
}

export function findHomepage(tenantId: string) {
  return tenantDb(tenantId).homepage.findFirstOrThrow();
}

export function findVisiblePackages(tenantId: string) {
  return tenantDb(tenantId).package.findMany({ where: { visible: true }, orderBy: bySortOrder });
}

export function findVisibleServices(tenantId: string) {
  return tenantDb(tenantId).service.findMany({ where: { visible: true }, orderBy: bySortOrder });
}

// Only reviews the client agreed to share, and the owner approved and featured
export function findFeaturedReviews(tenantId: string, take: number) {
  return tenantDb(tenantId).review.findMany({
    where: { status: "APPROVED", featured: true, consent: true },
    orderBy: bySortOrder,
    take,
  });
}

export function findPublishedSamples(tenantId: string) {
  return tenantDb(tenantId).sample.findMany({ where: { published: true }, orderBy: bySortOrder });
}

export function findVisibleFaqs(tenantId: string) {
  return tenantDb(tenantId).faq.findMany({ where: { visible: true }, orderBy: bySortOrder });
}

const postCard = {
  slug: true,
  title: true,
  category: true,
  excerpt: true,
  cover: true,
  coverAlt: true,
  authorName: true,
  readMinutes: true,
  publishedAt: true,
} as const;

export function findPublishedPosts(tenantId: string) {
  return tenantDb(tenantId).post.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
    select: postCard,
  });
}

export function findPublishedPost(tenantId: string, slug: string) {
  return tenantDb(tenantId).post.findFirst({ where: { status: "PUBLISHED", slug } });
}
