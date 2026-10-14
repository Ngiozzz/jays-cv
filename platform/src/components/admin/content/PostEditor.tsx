"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { deletePostAction, savePostAction } from "@/app/(admin)/admin/(signed-in)/content/actions";
import { Icon } from "@/components/icons/Icon";
import { COVERS, POST_CATEGORIES, slugify, type PostIntent } from "@/modules/content/admin/posts";
import type { AdminPost } from "@/modules/content/admin/posts.service";
import { useSave, useToast } from "./useSave";

const NEW_POST = {
  title: "",
  category: POST_CATEGORIES[0] as string,
  cover: COVERS[0].path as string,
  excerpt: "",
  body: "",
};

type Props = { post: AdminPost | null; owner: boolean; siteHost: string };

// Write or edit one article, with how it will look on Google. Writers send it to the owner;
// only the owner publishes.
export function PostEditor({ post, owner, siteHost }: Props) {
  const router = useRouter();
  const save = useSave();
  const [draft, setDraft] = useState(post ?? NEW_POST);
  const published = post?.status === "PUBLISHED";

  const run = (intent: PostIntent, form: HTMLFormElement) =>
    save.run(async () => {
      const result = await savePostAction(post?.id ?? null, intent, new FormData(form));
      if (result.ok && !post) router.replace(`/admin/content?tab=posts&post=${result.postId}`, { scroll: false });
      return result;
    });

  // Enter in a text box: the safe choice (keep it a draft, or keep a published article published)
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    run(published ? "publish" : "draft", event.currentTarget);
  };

  const button = (intent: PostIntent, label: string, primary = false) => (
    <button
      type="button"
      className={primary ? "btn btn-primary" : "btn btn-ghost"}
      disabled={save.pending}
      onClick={(event) => run(intent, event.currentTarget.form!)}
    >
      {save.pending ? "Saving…" : label}
    </button>
  );

  const field = (name: keyof typeof NEW_POST) => ({
    name,
    value: draft[name],
    onChange: (event: { target: { value: string } }) => setDraft({ ...draft, [name]: event.target.value }),
  });
  const cls = (name: string, full = false) =>
    ["f", full && "full", save.errors[name] && "invalid"].filter(Boolean).join(" ");
  const address = post?.slugFixed ? post.slug : slugify(draft.title || "article");

  return (
    <section className="panel editor-grid">
      <form className="panel-body" noValidate onSubmit={submit}>
        <h2 className="editor-title">{post ? "Edit article" : "New article"}</h2>
        {save.error("form")}
        <div className="fgrid">
          <div className={cls("title", true)}>
            <label htmlFor="ps-title">Title</label>
            <input
              id="ps-title"
              type="text"
              placeholder="e.g. 5 things recruiters look for in a graduate CV"
              {...field("title")}
            />
            {save.error("title")}
          </div>
          <div className={cls("category")}>
            <label htmlFor="ps-cat">Category</label>
            <select id="ps-cat" {...field("category")}>
              {POST_CATEGORIES.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
            {save.error("category")}
          </div>
          <div className={cls("cover")}>
            <label htmlFor="ps-cover">Cover photo</label>
            <select id="ps-cover" {...field("cover")}>
              {COVERS.map((cover) => (
                <option key={cover.path} value={cover.path}>
                  {cover.label}
                </option>
              ))}
            </select>
            {save.error("cover")}
          </div>
          <div className={cls("excerpt", true)}>
            <label htmlFor="ps-excerpt">
              Short summary <small>(shown on the Career tips page and Google)</small>
            </label>
            <input id="ps-excerpt" type="text" maxLength={160} {...field("excerpt")} />
            {save.error("excerpt")}
          </div>
          <div className={cls("body", true)}>
            <label htmlFor="ps-body">
              Article <small>(## for a heading, - for a bullet, **bold**)</small>
            </label>
            <textarea id="ps-body" rows={14} {...field("body")} />
            {save.error("body")}
          </div>
        </div>
        <div className="editor-actions">
          {!owner && (
            <>
              {button("draft", "Save draft")}
              {button("review", "Send to owner for review", true)}
            </>
          )}
          {owner && !published && (
            <>
              {button("draft", "Save draft")}
              {button("publish", "Publish", true)}
            </>
          )}
          {owner && published && (
            <>
              {button("unpublish", "Unpublish")}
              {button("publish", "Save & publish", true)}
            </>
          )}
        </div>
        {!owner && <p className="hint-sm">Writers draft articles; the owner reviews and publishes them.</p>}
        {post?.status === "REVIEW" && owner && (
          <p className="hint-sm">A writer sent this for review. Check it, then press Publish.</p>
        )}
        {post && <DeletePost postId={post.id} title={post.title} />}
      </form>
      <div className="panel-body preview-col">
        <p className="preview-label">How it looks on Google</p>
        <div className="serp">
          <small>
            {siteHost} › blog › {address}
          </small>
          <strong>{draft.title || "Article title"} | Jay CVS</strong>
          <p>{draft.excerpt || "Your short summary appears here."}</p>
        </div>
        <p className="preview-label" style={{ marginTop: 18 }}>
          Cover
        </p>
        <img className="post-cover-prev" src={draft.cover} alt="" />
      </div>
    </section>
  );
}

function DeletePost({ postId, title }: { postId: string; title: string }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  const remove = () => {
    if (!window.confirm(`Delete "${title}"?`)) return;
    startTransition(async () => {
      const result = await deletePostAction(postId);
      toast(result.ok ? { text: result.message, error: false } : { text: result.error, error: true });
      if (result.ok) router.replace("/admin/content?tab=posts", { scroll: false });
    });
  };

  return (
    <div className="publish-foot">
      <button type="button" className="btn btn-danger btn-sm" onClick={remove} disabled={pending}>
        <Icon name="trash" />
        Delete article
      </button>
    </div>
  );
}
