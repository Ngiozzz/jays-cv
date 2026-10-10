import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { homepageStatsSchema } from "./content.schema";
import * as repo from "./content.repo";

// Public pages are cached per business. When the owner edits content (phase 4),
// the admin calls updateTag(contentTag(tenantId)) and the pages refresh.
export const contentTag = (tenantId: string) => `content:${tenantId}`;

function cacheContent(tenantId: string) {
  cacheTag(contentTag(tenantId));
  cacheLife("days");
}

export async function getSiteChrome(tenantId: string) {
  "use cache";
  cacheContent(tenantId);
  const [settings, homepage] = await Promise.all([repo.findSettings(tenantId), repo.findHomepage(tenantId)]);
  return {
    settings,
    announcement: homepage.announcementOn && homepage.announcementText ? homepage : null,
  };
}

export async function getHomepage(tenantId: string) {
  "use cache";
  cacheContent(tenantId);
  const homepage = await repo.findHomepage(tenantId);
  return { ...homepage, stats: homepageStatsSchema.parse(homepage.stats) };
}

export async function getPriceList(tenantId: string) {
  "use cache";
  cacheContent(tenantId);
  const [packages, services] = await Promise.all([
    repo.findVisiblePackages(tenantId),
    repo.findVisibleServices(tenantId),
  ]);
  return { packages, services };
}

export type PriceList = Awaited<ReturnType<typeof getPriceList>>;
export type SitePackage = PriceList["packages"][number];
export type SiteService = PriceList["services"][number];

export async function getFeaturedReviews(tenantId: string) {
  "use cache";
  cacheContent(tenantId);
  return repo.findFeaturedReviews(tenantId, 3);
}

export type SiteReview = Awaited<ReturnType<typeof getFeaturedReviews>>[number];

export async function getSamples(tenantId: string) {
  "use cache";
  cacheContent(tenantId);
  return repo.findPublishedSamples(tenantId);
}

export type SiteSample = Awaited<ReturnType<typeof getSamples>>[number];

export async function getFaqs(tenantId: string) {
  "use cache";
  cacheContent(tenantId);
  return repo.findVisibleFaqs(tenantId);
}

export async function getPosts(tenantId: string) {
  "use cache";
  cacheContent(tenantId);
  return repo.findPublishedPosts(tenantId);
}

export type PostCard = Awaited<ReturnType<typeof getPosts>>[number];

export async function getPost(tenantId: string, slug: string) {
  "use cache";
  cacheContent(tenantId);
  return repo.findPublishedPost(tenantId, slug);
}
