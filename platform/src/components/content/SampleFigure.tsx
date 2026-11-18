"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import type { SiteSample } from "@/modules/content/content.service";

type Props = { sample: SiteSample; showTag?: boolean; variant?: "stack" | "feature" };
type Side = "before" | "after";

// A before/after pair. "feature" lays the two pages side by side on the desk (homepage); "stack" shows the new
// CV on top of the old one (samples page). Clicking opens the viewer, where the visitor can switch between
// the two and tap to zoom in, so the CV can actually be read.
export function SampleFigure({ sample, showTag = false, variant = "stack" }: Props) {
  const viewer = useRef<HTMLDialogElement>(null);
  const [side, setSide] = useState<Side>("after");
  const [zoomed, setZoomed] = useState(false);

  const open = (chosen: Side) => {
    setSide(chosen);
    setZoomed(false);
    viewer.current?.showModal();
  };
  const show = (chosen: Side) => {
    setSide(chosen);
    setZoomed(false);
  };
  const label = (s: Side) => `${sample.role} CV ${s === "before" ? "before the rewrite" : "after the rewrite"}`;
  const url = side === "before" ? sample.beforeUrl : sample.afterUrl;

  return (
    <figure className={variant === "feature" ? "sample sample-feature" : "sample sample-stack"} data-c={sample.tag}>
      {variant === "feature" ? (
        <div className="sample-pair">
          {(["before", "after"] as const).map((s) => (
            <button key={s} type="button" className="sample-open" onClick={() => open(s)} aria-label={`Open ${s} CV`}>
              <span className="lbl">{s === "before" ? "Before" : "After"}</span>
              <img src={s === "before" ? sample.beforeUrl : sample.afterUrl} alt={label(s)} loading="lazy" />
            </button>
          ))}
        </div>
      ) : (
        <button
          type="button"
          className="stackbox"
          onClick={() => open("after")}
          aria-label={`Open the ${sample.role} CVs`}
        >
          <img className="b" src={sample.beforeUrl} alt="" loading="lazy" />
          <img className="a" src={sample.afterUrl} alt={label("after")} loading="lazy" />
        </button>
      )}
      <figcaption>
        <span>
          {showTag && <span className="sample-tag">{sample.tag}</span>}
          <b>{sample.role}</b> <span className="soft">· {sample.caption}</span>
        </span>
        <button type="button" className="sample-read link" onClick={() => open("after")}>
          Read the CVs <Icon name="arrow" size={16} />
        </button>
      </figcaption>

      <dialog
        ref={viewer}
        className="sample-viewer"
        aria-label={`${sample.role} sample`}
        onClick={(event) => {
          // A click on the dark backdrop closes it
          if (event.target === viewer.current) viewer.current.close();
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") show("before");
          if (event.key === "ArrowRight") show("after");
        }}
      >
        <div className="sample-viewer-bar">
          <b>{sample.role}</b>
          <div className="seg" role="group" aria-label="Before or after">
            {(["before", "after"] as const).map((s) => (
              <button key={s} type="button" aria-pressed={side === s} onClick={() => show(s)}>
                {s === "before" ? "Before" : "After"}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="sample-viewer-close"
            onClick={() => viewer.current?.close()}
            aria-label="Close"
          >
            <Icon name="close" />
          </button>
        </div>
        <div className={zoomed ? "sample-viewer-page zoomed" : "sample-viewer-page"}>
          <img
            src={url}
            alt={label(side)}
            onClick={() => setZoomed((z) => !z)}
            title={zoomed ? "Tap to fit the screen" : "Tap to zoom in"}
          />
        </div>
        <p className="sample-viewer-hint">
          {zoomed ? "Tap the page to fit the screen" : "Tap the page to zoom in"} · Shared with permission, personal
          details removed
        </p>
      </dialog>
    </figure>
  );
}
