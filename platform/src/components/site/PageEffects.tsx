"use client";

import { useEffect } from "react";

// Small touches: header shadow on scroll, and concrete "draft by" dates on price cards.
// The page is fully readable without it.
export function PageEffects() {
  useEffect(() => {
    document.documentElement.classList.add("js");
    const header = document.querySelector(".site-header");
    const onScroll = () => header?.classList.toggle("scrolled", window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    // Price cards: "Draft within 24 hours" becomes "Draft by Thu 19 Nov", worked out here so cached pages stay right
    document.querySelectorAll<HTMLElement>("[data-draft-hours]").forEach((el) => {
      const due = new Date(Date.now() + Number(el.dataset.draftHours) * 3_600_000);
      el.textContent = `Draft by ${due.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}`;
    });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return null;
}
