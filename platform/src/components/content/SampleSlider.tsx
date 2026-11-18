"use client";

import { useState, type CSSProperties } from "react";
import type { SiteSample } from "@/modules/content/content.service";

// Drag between the old CV and the new one. The range input does the work, so it also works with a keyboard.
export function SampleSlider({ sample }: { sample: SiteSample }) {
  const [cut, setCut] = useState(50);
  return (
    <div className="compare">
      <div className="frame" style={{ "--cut": `${cut}%` } as CSSProperties}>
        <img src={sample.beforeUrl} alt={`${sample.role} CV before the rewrite`} />
        <div className="after-layer">
          <img src={sample.afterUrl} alt={`${sample.role} CV after the rewrite`} />
        </div>
        <span className="lab b">Before</span>
        <span className="lab a">After</span>
        <span className="handle" aria-hidden="true" />
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={cut}
        onChange={(event) => setCut(Number(event.target.value))}
        aria-label="Slide between the old and the new CV"
      />
      <span className="hint">Drag to compare</span>
    </div>
  );
}
