import type { SiteSample } from "@/modules/content/content.service";

type Props = { sample: SiteSample; showTag?: boolean };

export function SampleFigure({ sample, showTag = false }: Props) {
  return (
    <figure className="sample reveal">
      <div className="sample-pair">
        <img className="media" src={sample.beforeUrl} alt={`${sample.role} CV before rewrite`} loading="lazy" />
        <img
          className="media after"
          src={sample.afterUrl}
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
