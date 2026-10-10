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
        title="Career tips from our HR experts"
        lead="Practical advice on CVs, LinkedIn, interviews and job hunting in Kenya and abroad."
      />

      <section className="section" style={{ paddingTop: "24px" }}>
        <div className="container">
          {featured && <FeaturedPost post={featured} />}
          <CategoryFilter
            label="Filter articles by topic"
            gridClassName="card-grid blog-grid"
            items={rest.map((post) => ({
              key: post.slug,
              category: post.category,
              node: <PostCard post={post} showMeta />,
            }))}
          />
        </div>
      </section>

      <CtaBand whatsappHref={freeReviewHref} />
    </>
  );
}

function FeaturedPost({ post }: { post: PostCardData }) {
  const href = `/blog/${post.slug}`;
  return (
    <article className="card featured-post reveal">
      {post.cover && <img className="media" src={post.cover} alt={post.coverAlt ?? ""} loading="lazy" />}
      <div className="post-body">
        <span className="tag">{post.category}</span>
        <h2>
          <Link href={href}>{post.title}</Link>
        </h2>
        <p>{post.excerpt}</p>
        <p className="post-meta">
          {post.authorName} · {postMeta(post)}
        </p>
        <Link className="card-link" href={href}>
          Read article <Icon name="arrow" />
        </Link>
      </div>
    </article>
  );
}
