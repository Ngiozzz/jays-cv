import Link from "next/link";
import type { PostCard as PostCardData } from "@/modules/content/content.service";

type Props = { post: PostCardData; showMeta?: boolean };

export function postMeta(post: Pick<PostCardData, "publishedAt" | "readMinutes">): string {
  const month = post.publishedAt?.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
  return [month, `${post.readMinutes} min read`].filter(Boolean).join(" · ");
}

export function PostCard({ post, showMeta = false }: Props) {
  return (
    <article className="card post reveal">
      {post.cover && <img className="media" src={post.cover} alt={post.coverAlt ?? ""} loading="lazy" />}
      <div className="post-body">
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
