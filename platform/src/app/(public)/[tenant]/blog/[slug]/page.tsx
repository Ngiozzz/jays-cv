import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleBody } from "@/components/content/ArticleBody";
import { PostCard, postMeta } from "@/components/content/PostCard";
import { CtaBand } from "@/components/site/CtaBand";
import { Breadcrumb } from "@/components/site/PageHero";
import { SectionHead } from "@/components/site/SectionHead";
import { getPost, getPosts } from "@/modules/content/content.service";
import { allTenantSlugs, getTenant } from "@/modules/tenants/tenants.service";
import { siteContext } from "../../site-context";

// Prerender every published article of every business; new ones render on first visit, then stay cached
export async function generateStaticParams() {
  const params: { tenant: string; slug: string }[] = [];
  for (const slug of await allTenantSlugs()) {
    const tenant = await getTenant(slug);
    for (const post of await getPosts(tenant.id)) params.push({ tenant: slug, slug: post.slug });
  }
  return params;
}

export async function generateMetadata({ params }: PageProps<"/[tenant]/blog/[slug]">): Promise<Metadata> {
  const { tenant: tenantSlug, slug } = await params;
  const post = await getPost((await getTenant(tenantSlug)).id, slug);
  return post ? { title: post.title, description: post.excerpt } : {};
}

export default async function ArticlePage({ params }: PageProps<"/[tenant]/blog/[slug]">) {
  const { tenant, freeReviewHref } = await siteContext(params);
  const { slug } = await params;
  const [post, posts] = await Promise.all([getPost(tenant.id, slug), getPosts(tenant.id)]);
  if (!post) notFound();
  const related = posts.filter((other) => other.slug !== post.slug).slice(0, 3);

  return (
    <>
      <article>
        <header className="article-hero">
          <div className="container">
            <Breadcrumb crumbs={[{ href: "/blog", label: "Career tips" }, { label: post.category }]} />
            <span className="tag">{post.category}</span>
            <h1 style={{ marginTop: "14px" }}>{post.title}</h1>
            <p className="lead" style={{ marginBottom: 0 }}>
              {post.excerpt}
            </p>
            <div className="author">
              <img className="avatar" src="/img/photos/avatar-author.jpg" alt="" loading="lazy" />
              <div>
                <strong>{post.authorName}</strong>
                <span>{postMeta(post)}</span>
              </div>
            </div>
          </div>
        </header>

        <div className="container">
          {post.cover && (
            <div className="article-cover">
              <img className="media" src={post.cover} alt={post.coverAlt ?? ""} loading="lazy" />
            </div>
          )}
          <ArticleBody markdown={post.body} />
          <div className="prose">
            <div className="callout">
              <h3>Want an expert to fix these for you?</h3>
              <p>Send us your current CV on WhatsApp for a free review. We&apos;ll tell you exactly what to improve.</p>
              <p>
                <a className="btn btn-primary" href={freeReviewHref} target="_blank" rel="noopener">
                  Get a free CV review
                </a>
              </p>
            </div>
          </div>
        </div>
      </article>

      {related.length > 0 && (
        <section className="section">
          <div className="container">
            <SectionHead
              eyebrow="Keep reading"
              title="Related articles"
              action={
                <Link className="btn btn-ghost" href="/blog">
                  All career tips
                </Link>
              }
            />
            <div className="card-grid blog-grid">
              {related.map((other) => (
                <PostCard key={other.slug} post={other} />
              ))}
            </div>
          </div>
        </section>
      )}

      <CtaBand whatsappHref={freeReviewHref} />
    </>
  );
}
