import type { Metadata } from "next";
import Link from "next/link";
import { FaqList } from "@/components/content/FaqList";
import { PackageCards } from "@/components/content/PackageCards";
import { PostCard } from "@/components/content/PostCard";
import { ReviewCards } from "@/components/content/ReviewCards";
import { SampleFigure } from "@/components/content/SampleFigure";
import { HomeHero } from "@/components/home/HomeHero";
import { HomeServices } from "@/components/home/HomeServices";
import { HomeSteps } from "@/components/home/HomeSteps";
import { CtaBand } from "@/components/site/CtaBand";
import { SectionHead } from "@/components/site/SectionHead";
import { whatsappLink } from "@/modules/content/contact";
import * as content from "@/modules/content/content.service";
import { draftTimeLabel } from "@/modules/content/packages";
import { standardDraftHours } from "@/modules/content/pricing";
import { siteContext } from "./site-context";

export const metadata: Metadata = {
  title: { absolute: "Jay CVS | Professional CV Writing & Career Services in Kenya" },
  description:
    "Professional CV writing, cover letters, LinkedIn profile revamps, career coaching and job application support in Nairobi, Kenya. Pay via M-Pesa.",
};

export default async function HomePage({ params }: PageProps<"/[tenant]">) {
  const { tenant, settings, freeReviewHref } = await siteContext(params);
  const [home, prices, samples, reviews, posts, faqs] = await Promise.all([
    content.getHomepage(tenant.id),
    content.getPriceList(tenant.id),
    content.getSamples(tenant.id),
    content.getFeaturedReviews(tenant.id),
    content.getPosts(tenant.id),
    content.getFaqs(tenant.id),
  ]);
  const wa = settings.whatsapp;
  const draftTime = draftTimeLabel(standardDraftHours(prices.packages));

  return (
    <>
      <HomeHero {...home} draftTime={draftTime} />
      <HomeServices adviceHref={whatsappLink(wa, "Hi Jay CVS, I'm not sure which service I need")} />
      <HomeSteps draftTime={draftTime} />

      <section className="section" id="pricing">
        <div className="container">
          <SectionHead eyebrow="Pricing" title="Simple, transparent packages">
            <p>No hidden charges. Pay securely by M-Pesa.</p>
          </SectionHead>
          <PackageCards packages={prices.packages} whatsapp={wa} />
          <p className="pricing-note">
            Need just a cover letter or LinkedIn revamp?{" "}
            <Link href="/pricing#individual">See individual service prices →</Link>
          </p>
        </div>
      </section>

      <section className="section section-alt" id="samples">
        <div className="container">
          <SectionHead eyebrow="Our work" title="See the difference">
            <p>Real client CVs, before and after. Personal details removed with permission.</p>
          </SectionHead>
          <div className="samples-grid">
            {samples.slice(0, 3).map((sample) => (
              <SampleFigure key={sample.id} sample={sample} />
            ))}
          </div>
          <p className="pricing-note">
            <Link href="/samples">See more samples →</Link>
          </p>
        </div>
      </section>

      {reviews.length > 0 && (
        <section className="section" id="testimonials">
          <div className="container">
            <SectionHead eyebrow="Client stories" title="People who landed the job" />
            <ReviewCards reviews={reviews} />
          </div>
        </section>
      )}

      <section className="section" id="insights">
        <div className="container">
          <SectionHead
            eyebrow="Career tips"
            title="Advice from our HR experts"
            action={
              <Link className="btn btn-ghost" href="/blog">
                View all articles
              </Link>
            }
          />
          <div className="card-grid blog-grid">
            {posts.slice(0, 3).map((post) => (
              <PostCard key={post.slug} post={post} />
            ))}
          </div>
        </div>
      </section>

      <section className="section section-alt" id="faq">
        <div className="container faq-inner">
          <SectionHead eyebrow="FAQ" title="Questions, answered">
            <p>
              Can&apos;t find what you&apos;re looking for?{" "}
              <a href={whatsappLink(wa)} target="_blank" rel="noopener">
                Chat with us
              </a>
              .
            </p>
          </SectionHead>
          <FaqList faqs={faqs} />
        </div>
      </section>

      <CtaBand whatsappHref={freeReviewHref} />
    </>
  );
}
