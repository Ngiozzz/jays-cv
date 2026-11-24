"use client";

import { useEffect, useRef } from "react";
import { splitCount } from "./count-up";

const DURATION_MS = 1400;

// A homepage fact ("2,000+", "48 hrs", "4.9/5") whose number counts up from 0 the first time it
// comes into view. The server renders the final value, so it reads right without JavaScript, and
// screen readers only ever get the final value.
export function CountUp({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    const parts = splitCount(value);
    if (!el || !parts || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    const show = (n: number) => {
      el.textContent = parts.prefix + parts.format(n) + parts.suffix;
    };
    show(0);
    const run = () => {
      // The clock starts on the first frame: a frame's timestamp can be earlier than performance.now()
      let start: number | null = null;
      const tick = (t: number) => {
        start ??= t;
        const progress = Math.min(1, Math.max(0, (t - start) / DURATION_MS));
        // Ease out: quick at first, settling on the real number
        show(parts.target * (1 - Math.pow(1 - progress, 3)));
        if (progress < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          run();
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      show(parts.target);
    };
  }, [value]);

  return (
    <>
      <span ref={ref} aria-hidden="true">
        {value}
      </span>
      <span className="sr-only">{value}</span>
    </>
  );
}
