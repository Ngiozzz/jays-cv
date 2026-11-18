import type { Metadata } from "next";
import Link from "next/link";
import { CategoryFilter } from "@/components/content/CategoryFilter";
import { PostCard, postMeta } from "@/components/content/PostCard";
import { Icon } from "@/components/icons/Icon";
import { CtaBand } from "@/components/site/CtaBand";
import { PageHero } from "@/components/site/PageHero";
import { getPosts, type PostCard as PostCardData } from "@/modules/content/content.service";
import { siteContext } from "../site-context";

export const metadata: Metadata = {
  title: "Career Tips",
  description: "CV tips, LinkedIn advice, interview preparation and job search guides from Jay CVS HR experts.",
};

export default async function BlogPage({ params }: PageProps<"/[tenant]/blog">) {
  const { tenant, freeReviewHref } = await siteContext(params);
  const [featured, ...rest] = await getPosts(tenant.id);

  return (
    <>
      <PageHero
        crumbs={[{ label: "Career tips" }]}
        title="Advice from people who hire"
        lead="Practical advice on CVs, LinkedIn, interviews and job hunting in Kenya and abroad."
      >
        {featured && <FeaturedPost post={featured} />}
      </PageHero>

      <section className="section">
        <div className="container">
          <CategoryFilter
            label="Filter articles by topic"
            gridClassName="post-list"
            items={rest.map((post) => ({
              key: post.slug,
              category: post.category,
              node: <PostCard post={post} showMeta />,
            }))}
          />
        </div>
      </section>

      <CtaBand
        whatsappHref={freeReviewHref}
        title="Rather have an expert look at it?"
        text="Send your current CV on WhatsApp for a free review. We'll tell you what to fix first."
      />
    </>
  );
}

function FeaturedPost({ post }: { post: PostCardData }) {
  const href = `/blog/${post.slug}`;
  return (
    <article className="featured-post">
      {post.cover && (
        <Link href={href} tabIndex={-1} aria-hidden="true">
          <img src={post.cover} alt={post.coverAlt ?? ""} />
        </Link>
      )}
      <div>
        <span className="tag">{post.category}</span>
        <h2>
          <Link href={href}>{post.title}</Link>
        </h2>
        <p>{post.excerpt}</p>
        <p className="post-meta">
          <span className="av" aria-hidden="true">
            {post.authorName.charAt(0)}
          </span>
          {post.authorName} · {postMeta(post)}
        </p>
        <Link className="link" href={href}>
          Read article <Icon name="arrow" size={16} />
        </Link>
      </div>
    </article>
  );
}
