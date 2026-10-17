"use client";

import { useRef, useState } from "react";
import type { SiteSample } from "@/modules/content/content.service";

type Props = { sample: SiteSample; showTag?: boolean };
type Side = "before" | "after";

// A before/after pair. Clicking either page opens it full screen, where the visitor can switch
// between the two and tap to zoom in, so the CV can actually be read.
export function SampleFigure({ sample, showTag = false }: Props) {
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
  const label = (s: Side) => `${sample.role} CV ${s === "before" ? "before rewrite" : "after professional rewrite"}`;
  const url = side === "before" ? sample.beforeUrl : sample.afterUrl;

  return (
    <figure className="sample reveal">
      <div className="sample-pair">
        {(["before", "after"] as const).map((s) => (
          <button key={s} type="button" className="sample-open" onClick={() => open(s)} aria-label={`Open ${s} CV`}>
            <img
              className={s === "after" ? "media after" : "media"}
              src={s === "before" ? sample.beforeUrl : sample.afterUrl}
              alt={label(s)}
              loading="lazy"
            />
          </button>
        ))}
      </div>
      <figcaption>
        {showTag && (
          <>
            <span className="sample-tag">{sample.tag}</span>
            <br />
          </>
        )}
        <strong>{sample.role}</strong> · {sample.caption}
        <br />
        <button type="button" className="sample-read" onClick={() => open("after")}>
          Read the CVs →
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
          <strong>{sample.role}</strong>
          <div className="sample-viewer-tabs" role="group" aria-label="Before or after">
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
            ×
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
          {zoomed ? "Tap the page to fit the screen" : "Tap the page to zoom in"} · Personal details removed with
          permission
        </p>
      </dialog>
    </figure>
  );
}
