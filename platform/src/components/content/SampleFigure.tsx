import type { SiteSample } from "@/modules/content/content.service";

type Props = { sample: SiteSample; showTag?: boolean };

// Before/after images live in /public/img/samples, named after the sample's slug
export function SampleFigure({ sample, showTag = false }: Props) {
  const image = (side: "before" | "after") => `/img/samples/${sample.slug}-${side}.jpeg`;
  return (
    <figure className="sample reveal">
      <div className="sample-pair">
        <img className="media" src={image("before")} alt={`${sample.role} CV before rewrite`} loading="lazy" />
        <img
          className="media after"
          src={image("after")}
          alt={`${sample.role} CV after professional rewrite`}
          loading="lazy"
        />
      </div>
      <figcaption>
        {showTag && (
          <>
            <span className="sample-tag">{sample.tag}</span>
            <br />
          </>
        )}
        <strong>{sample.role}</strong> · {sample.caption}
      </figcaption>
    </figure>
  );
}
