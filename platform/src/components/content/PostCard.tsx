import Link from "next/link";
import type { PostCard as PostCardData } from "@/modules/content/content.service";

type Props = { post: PostCardData; showMeta?: boolean; variant?: "lead" | "row" };

export function postMeta(post: Pick<PostCardData, "publishedAt" | "readMinutes">): string {
  const month = post.publishedAt?.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
  return [month, `${post.readMinutes} min read`].filter(Boolean).join(" · ");
}

// An article as a large lead (photo on top) or as a row (small photo beside the title)
export function PostCard({ post, showMeta = false, variant = "row" }: Props) {
  return (
    <article className={variant === "lead" ? "post post-lead" : "post post-row"} data-c={post.category}>
      {post.cover ? (
        <Link href={`/blog/${post.slug}`} tabIndex={-1} aria-hidden="true">
          <img src={post.cover} alt={post.coverAlt ?? ""} loading="lazy" />
        </Link>
      ) : (
        <span className="post-noimg" aria-hidden="true" />
      )}
      <div>
        <span className="tag">{post.category}</span>
        <h3>
          <Link href={`/blog/${post.slug}`}>{post.title}</Link>
        </h3>
        <p>{post.excerpt}</p>
        {showMeta && <p className="post-meta">{postMeta(post)}</p>}
      </div>
    </article>
  );
}
