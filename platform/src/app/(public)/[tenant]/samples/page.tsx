import type { Metadata } from "next";
import { CategoryFilter } from "@/components/content/CategoryFilter";
import { ReviewCards } from "@/components/content/ReviewCards";
import { SampleFigure } from "@/components/content/SampleFigure";
import { SampleSlider } from "@/components/content/SampleSlider";
import { CtaBand } from "@/components/site/CtaBand";
import { PageHero } from "@/components/site/PageHero";
import { SectionHead } from "@/components/site/SectionHead";
import { getFeaturedReviews, getSamples } from "@/modules/content/content.service";
import { siteContext } from "../site-context";

export const metadata: Metadata = {
  title: "CV Samples",
  description:
    "Before-and-after CV samples written by Jay CVS for accountants, engineers, nurses, NGO professionals and more.",
};

export default async function SamplesPage({ params }: PageProps<"/[tenant]/samples">) {
  const { tenant, freeReviewHref } = await siteContext(params);
  const [samples, reviews] = await Promise.all([getSamples(tenant.id), getFeaturedReviews(tenant.id)]);
  const feature = samples[0];

  return (
    <>
      <PageHero
        crumbs={[{ label: "Samples" }]}
        title="The same career, rewritten"
        lead="Client CVs before and after, shared with permission and with personal details removed."
      >
        {feature && (
          <div className="feature">
            <SampleSlider sample={feature} />
            <div>
              <p className="kicker">{feature.tag}</p>
              <h2>{feature.role}</h2>
              <p className="who">{feature.caption}</p>
              <p className="feature-note">
                Drag across the page to see what changed: a profile that says who they are, results with numbers, and a
                layout a recruiter can scan in seconds.
              </p>
            </div>
          </div>
        )}
      </PageHero>

      <section className="section" id="all">
        <div className="container">
          <CategoryFilter
            label="Filter samples by industry"
            gridClassName="gallery"
            items={samples.map((sample) => ({
              key: sample.id,
              category: sample.tag,
              node: <SampleFigure sample={sample} showTag />,
            }))}
          />
        </div>
      </section>

      {reviews.length > 0 && (
        <section className="section section-alt">
          <div className="container">
            <SectionHead title="What clients said afterwards" />
            <ReviewCards reviews={reviews} />
          </div>
        </section>
      )}

      <CtaBand
        whatsappHref={freeReviewHref}
        title="Want yours to look like this?"
        text="Send your current CV on WhatsApp for a free review, or choose a package and upload it now."
        primaryLabel="Free review"
        secondary={{ href: "/pricing", label: "Choose a package" }}
      />
    </>
  );
}
