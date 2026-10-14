"use client";

import { useEffect } from "react";

// Small visual touch from the preview: header shadow on scroll. (Cards fading in is pure CSS.)
// The page is fully readable without it.
export function PageEffects() {
  useEffect(() => {
    document.documentElement.classList.add("js");
    const header = document.querySelector(".site-header");
    const onScroll = () => header?.classList.toggle("scrolled", window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return null;
}
