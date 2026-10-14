import "server-only";
import { tenantDb } from "@/lib/tenant-db";
import type { Tx } from "./history";
import type { PostStatus } from "./posts";

// Articles for the admin list: everyone's for the owner, a writer's own for a writer
export function findPosts(tenantId: string, authorId?: string) {
  return tenantDb(tenantId).post.findMany({
    where: authorId ? { authorId } : {},
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      category: true,
      status: true,
      authorId: true,
      authorName: true,
      slug: true,
      updatedAt: true,
    },
  });
}

export function findPost(tenantId: string, id: string) {
  return tenantDb(tenantId).post.findFirst({ where: { id } });
}

export async function findSlugs(tenantId: string, exceptId?: string) {
  const posts = await tenantDb(tenantId).post.findMany({
    where: exceptId ? { id: { not: exceptId } } : {},
    select: { slug: true },
  });
  return posts.map((post) => post.slug);
}

// Everything about an article, so a change (or a deletion) can be put back exactly
export type PostRecord = {
  id: string;
  slug: string;
  title: string;
  category: string;
  status: PostStatus;
  authorId: string | null;
  authorName: string;
  cover: string | null;
  coverAlt: string | null;
  excerpt: string;
  body: string;
  readMinutes: number;
  publishedAt: Date | null;
};

export function createPost(tx: Tx, tenantId: string, post: Omit<PostRecord, "id"> & { id?: string }) {
  return tx.post.create({ data: { ...post, tenantId } });
}

export function updatePost(tx: Tx, id: string, data: Partial<Omit<PostRecord, "id">>) {
  return tx.post.update({ where: { id }, data });
}

export function deletePost(tx: Tx, id: string) {
  return tx.post.delete({ where: { id } });
}
