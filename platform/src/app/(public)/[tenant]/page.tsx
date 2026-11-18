import type { Metadata } from "next";
import Link from "next/link";
import { FaqList } from "@/components/content/FaqList";
import { PackageCards } from "@/components/content/PackageCards";
import { PostCard } from "@/components/content/PostCard";
import { ReviewCards } from "@/components/content/ReviewCards";
import { SampleFigure } from "@/components/content/SampleFigure";
import { Icon } from "@/components/icons/Icon";
import { HomeHero } from "@/components/home/HomeHero";
import { HomeJay } from "@/components/home/HomeJay";
import { HomeJobs } from "@/components/home/HomeJobs";
import { HomeServices } from "@/components/home/HomeServices";
import { HomeSteps } from "@/components/home/HomeSteps";
import { CtaBand } from "@/components/site/CtaBand";
import { SectionHead } from "@/components/site/SectionHead";
import { whatsappLink } from "@/modules/content/contact";
import * as content from "@/modules/content/content.service";
import { draftTimeLabel } from "@/modules/content/packages";
import { standardDraftHours } from "@/modules/content/pricing";
import { toBoardListing } from "@/modules/jobs/board-filter";
import { getJobBoard } from "@/modules/jobs/jobs.public";
import { siteContext } from "./site-context";

export const metadata: Metadata = {
  title: { absolute: "Jay CVS | Professional CV Writing & Career Services in Kenya" },
  description:
    "Professional CV writing, cover letters, LinkedIn profile revamps, career coaching and job application support in Nairobi, Kenya. Pay via M-Pesa.",
};

export default async function HomePage({ params }: PageProps<"/[tenant]">) {
  const { tenant, settings, freeReviewHref } = await siteContext(params);
  const [home, about, prices, samples, reviews, posts, faqs, board] = await Promise.all([
    content.getHomepage(tenant.id),
    content.getAboutPage(tenant.id),
    content.getPriceList(tenant.id),
    content.getSamples(tenant.id),
    content.getFeaturedReviews(tenant.id),
    content.getPosts(tenant.id),
    content.getFaqs(tenant.id),
    getJobBoard(tenant.id),
  ]);
  const wa = settings.whatsapp;
  const draftTime = draftTimeLabel(standardDraftHours(prices.packages));
  const [leadSample, ...moreSamples] = samples;
  const [leadPost, ...morePosts] = posts;

  return (
    <>
      <HomeHero {...home} draftTime={draftTime} />
      <HomeJobs
        latest={board.jobs.slice(0, 6).map(toBoardListing)}
        openCount={board.jobs.length}
        today={board.today}
        channelLink={settings.channelLink}
      />
      <HomeServices adviceHref={whatsappLink(wa, "Hi Jay CVS, I'm not sure which service I need")} />
      <HomeSteps draftTime={draftTime} />

      <section className="section section-alt" id="pricing">
        <div className="container">
          <SectionHead title="Three packages, one payment">
            <p>No hidden charges. Pay once by M-Pesa when you upload your CV.</p>
          </SectionHead>
          <PackageCards packages={prices.packages} />
          <p className="plans-note">
            Only need a cover letter or a LinkedIn revamp?{" "}
            <Link className="text-link" href="/pricing#individual">
              See single service prices
            </Link>
          </p>
        </div>
      </section>

      {leadSample && (
        <section className="section" id="samples">
          <div className="container">
            <SectionHead title="The same career, rewritten">
              <p>Client CVs before and after, shared with permission and with personal details removed.</p>
            </SectionHead>
            <div className="home-samples">
              <SampleFigure sample={leadSample} variant="feature" />
              <div className="minis">
                {moreSamples.slice(0, 2).map((sample) => (
                  <Link key={sample.id} className="mini" href="/samples">
                    <img src={sample.afterUrl} alt="" loading="lazy" />
                    <div>
                      <b>{sample.role}</b>
                      <span>{sample.caption}</span>
                    </div>
                  </Link>
                ))}
                <Link className="link" href="/samples">
                  All {samples.length} samples <Icon name="arrow" size={16} />
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      <HomeJay
        name={about.ownerName}
        role={about.ownerRole}
        lead={about.lead}
        story={about.story}
        photoUrl={about.photoUrl}
        businessName={tenant.name}
      />

      {reviews.length > 0 && (
        <section className="section" id="testimonials">
          <div className="container">
            <SectionHead title="People who landed the job" />
            <ReviewCards reviews={reviews} />
          </div>
        </section>
      )}

      {leadPost && (
        <section className="section section-alt" id="insights">
          <div className="container">
            <SectionHead
              title="Advice from people who hire"
              action={
                <Link className="link" href="/blog">
                  All articles <Icon name="arrow" size={16} />
                </Link>
              }
            />
            <div className="posts">
              <PostCard post={leadPost} variant="lead" />
              <div>
                {morePosts.slice(0, 3).map((post) => (
                  <PostCard key={post.slug} post={post} />
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="section" id="faq">
        <div className="container faq">
          <div className="intro">
            <h2>Questions, answered</h2>
            <p>
              Can&apos;t find yours?{" "}
              <a className="text-link" href={whatsappLink(wa)} target="_blank" rel="noopener">
                Ask us on WhatsApp
              </a>
            </p>
          </div>
          <FaqList faqs={faqs} />
        </div>
      </section>

      <CtaBand whatsappHref={freeReviewHref} />
    </>
  );
}
