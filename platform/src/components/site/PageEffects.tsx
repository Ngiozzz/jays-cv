"use client";

import { useEffect } from "react";

// Small touch: the header gets a shadow once the page scrolls.
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
