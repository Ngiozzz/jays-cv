import "server-only";
import type { CurrentMember } from "@/modules/team/current-member";
import { assertCan, can } from "@/modules/team/permissions";
import * as history from "./history";
import {
  canEditPost,
  coverAlt,
  describePostSave,
  freeSlug,
  POST_INTENTS,
  postSchema,
  readMinutes,
  slugify,
  statusAfter,
  type PostIntent,
} from "./posts";
import * as repo from "./posts.repo";
import type { PostRecord } from "./posts.repo";
import { fieldErrorsOf, type FieldErrors } from "./save-result";

// Admin → Website content → Career tips. Writers draft and send articles to the owner; the owner
// publishes. Each save records the article as it was, so the owner can undo it.

const editorOf = (member: CurrentMember) => ({ id: member.id, owner: can(member, "editWebsiteContent") });

export async function loadPosts(member: CurrentMember) {
  assertCan(member, "draftCareerTips");
  const editor = editorOf(member);
  const posts = await repo.findPosts(member.tenant.id, editor.owner ? undefined : member.id);
  return posts.map((post) => ({
    ...post,
    updatedAt: post.updatedAt.toISOString(),
    editable: canEditPost(editor, post),
  }));
}

export type AdminPostRow = Awaited<ReturnType<typeof loadPosts>>[number];

// The article to edit, if this member may edit it
export async function loadPost(member: CurrentMember, postId: string) {
  assertCan(member, "draftCareerTips");
  const post = await repo.findPost(member.tenant.id, postId);
  if (!post || !canEditPost(editorOf(member), post)) return null;
  return {
    id: post.id,
    title: post.title,
    category: post.category,
    cover: post.cover ?? "",
    excerpt: post.excerpt,
    body: post.body,
    status: post.status,
    slug: post.slug,
    // Once published, the web address stays the same so links and Google keep working
    slugFixed: post.publishedAt !== null,
  };
}

export type AdminPost = NonNullable<Awaited<ReturnType<typeof loadPost>>>;

// What "Recent changes" keeps: the article as it was, or the id of an article that was new
type PostBefore = { post: PostRecord } | { added: string };

const recordOf = (post: PostRecord): PostRecord => ({
  id: post.id,
  slug: post.slug,
  title: post.title,
  category: post.category,
  status: post.status,
  authorId: post.authorId,
  authorName: post.authorName,
  cover: post.cover,
  coverAlt: post.coverAlt,
  excerpt: post.excerpt,
  body: post.body,
  readMinutes: post.readMinutes,
  publishedAt: post.publishedAt,
});

export async function restorePost(tx: history.Tx, before: unknown, tenantId: string) {
  const saved = before as PostBefore;
  if ("added" in saved) return repo.deletePost(tx, saved.added);
  const { id, publishedAt, ...data } = saved.post;
  const post = { ...data, publishedAt: publishedAt ? new Date(publishedAt) : null };
  const exists = await tx.post.findFirst({ where: { id }, select: { id: true } });
  return exists ? repo.updatePost(tx, id, post) : repo.createPost(tx, tenantId, { id, ...post });
}

export type SavePostResult = { ok: true; message: string; postId: string } | { ok: false; fieldErrors: FieldErrors };

export async function savePost(
  member: CurrentMember,
  postId: string | null,
  intent: PostIntent,
  raw: unknown,
): Promise<SavePostResult> {
  assertCan(member, "draftCareerTips");
  if (!POST_INTENTS.includes(intent)) return { ok: false, fieldErrors: { form: "Unknown action." } };
  const parsed = postSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };
  const editor = editorOf(member);
  const next = statusAfter(editor, intent);
  if (!next.ok) return { ok: false, fieldErrors: { form: next.error } };

  const tenantId = member.tenant.id;
  const existing = postId ? await repo.findPost(tenantId, postId) : null;
  if (postId && (!existing || !canEditPost(editor, existing)))
    return { ok: false, fieldErrors: { form: "You can't edit this article." } };

  const input = parsed.data;
  const slug = existing?.publishedAt
    ? existing.slug
    : freeSlug(slugify(input.title), await repo.findSlugs(tenantId, existing?.id));
  const fields = {
    ...input,
    coverAlt: coverAlt(input.cover),
    slug,
    status: next.status,
    readMinutes: readMinutes(input.body),
    publishedAt: next.status === "PUBLISHED" ? (existing?.publishedAt ?? new Date()) : (existing?.publishedAt ?? null),
  };
  const summary = describePostSave(intent, input.title, existing?.status === "PUBLISHED");

  const savedId = await history.inTransaction(tenantId, async (tx) => {
    const post = existing
      ? await repo.updatePost(tx, existing.id, fields)
      : await repo.createPost(tx, tenantId, { ...fields, authorId: member.id, authorName: member.name });
    const before: PostBefore = existing ? { post: recordOf(existing) } : { added: post.id };
    await history.recordChange(tx, tenantId, { section: "posts", summary, before, changedById: member.id });
    return post.id;
  });
  const live = next.status === "PUBLISHED" ? "Saved & published" : "Saved";
  return { ok: true, message: `${live}: ${summary}`, postId: savedId };
}

// The owner may delete any article; a writer only their own unpublished ones. Undo brings it back.
export async function deletePost(
  member: CurrentMember,
  postId: string,
): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  assertCan(member, "draftCareerTips");
  const tenantId = member.tenant.id;
  const post = await repo.findPost(tenantId, postId);
  if (!post || !canEditPost(editorOf(member), post)) return { ok: false, error: "You can't delete this article." };
  const summary = `deleted the article "${post.title}"`;
  await history.inTransaction(tenantId, async (tx) => {
    await repo.deletePost(tx, post.id);
    const before: PostBefore = { post: recordOf(post) };
    await history.recordChange(tx, tenantId, { section: "posts", summary, before, changedById: member.id });
  });
  const undo = editorOf(member).owner ? " Undo is in Recent changes." : "";
  return { ok: true, message: `Deleted: "${post.title}".${undo}` };
}
