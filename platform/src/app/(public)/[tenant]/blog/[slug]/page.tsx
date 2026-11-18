import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleBody, articleHeadings } from "@/components/content/ArticleBody";
import { Icon } from "@/components/icons/Icon";
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

  const headings = articleHeadings(post.body);
  const shareText = encodeURIComponent(post.title);

  return (
    <>
      <article>
        <header className="a-head">
          <div className="container rise">
            <Breadcrumb crumbs={[{ href: "/blog", label: "Career tips" }, { label: post.category }]} />
            <div className="inner">
              <span className="tag">{post.category}</span>
              <h1>{post.title}</h1>
              <p className="lead">{post.excerpt}</p>
              <div className="byline">
                <span className="av" aria-hidden="true">
                  {post.authorName.charAt(0)}
                </span>
                <div>
                  <b>{post.authorName}</b>
                  <span>{postMeta(post)}</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="container">
          {post.cover && (
            <figure className="a-hero">
              <img src={post.cover} alt={post.coverAlt ?? ""} />
            </figure>
          )}
          <div className="a-body">
            <aside className="toc" aria-label="In this article">
              {headings.length > 0 && (
                <>
                  <p>In this article</p>
                  {headings.map((heading) => (
                    <a key={heading.id} href={`#${heading.id}`}>
                      {heading.text}
                    </a>
                  ))}
                </>
              )}
              <div className="share">
                <a
                  href={`https://wa.me/?text=${shareText}`}
                  target="_blank"
                  rel="noopener"
                  aria-label="Share on WhatsApp"
                >
                  <Icon name="chat" size={16} />
                </a>
              </div>
            </aside>
            <div>
              <ArticleBody markdown={post.body} />
              <div className="callout">
                <div>
                  <b>Want an expert to fix these for you?</b>
                  <span>
                    Send us your current CV on WhatsApp for a free review. We&apos;ll tell you what to improve.
                  </span>
                </div>
                <a className="btn btn-light" href={freeReviewHref} target="_blank" rel="noopener">
                  Get a free CV review
                </a>
              </div>
            </div>
          </div>
        </div>
      </article>

      {related.length > 0 && (
        <section className="section section-alt">
          <div className="container">
            <SectionHead
              title="Related articles"
              action={
                <Link className="link" href="/blog">
                  All career tips <Icon name="arrow" size={16} />
                </Link>
              }
            />
            <div className="rel">
              {related.map((other) => (
                <PostCard key={other.slug} post={other} variant="lead" />
              ))}
            </div>
          </div>
        </section>
      )}

      <CtaBand whatsappHref={freeReviewHref} />
    </>
  );
}
