import type { Metadata } from "next";
import { CategoryFilter } from "@/components/content/CategoryFilter";
import { ReviewCards } from "@/components/content/ReviewCards";
import { SampleFigure } from "@/components/content/SampleFigure";
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

  return (
    <>
      <PageHero
        crumbs={[{ label: "Samples" }]}
        title="See the difference a professional CV makes"
        lead="Real client CVs, before and after. Shared with permission and with personal details removed."
      />

      <section className="section" style={{ paddingTop: "24px" }}>
        <div className="container">
          <CategoryFilter
            label="Filter samples by industry"
            gridClassName="samples-grid"
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
            <SectionHead eyebrow="Client stories" title="People who landed the job" />
            <ReviewCards reviews={reviews} />
          </div>
        </section>
      )}

      <CtaBand whatsappHref={freeReviewHref} />
    </>
  );
}
