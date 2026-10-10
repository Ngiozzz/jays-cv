"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

// Small visual touches from the preview: header shadow on scroll and cards fading in.
// The page is fully readable without them.
export function PageEffects() {
  const pathname = usePathname();

  useEffect(() => {
    document.documentElement.classList.add("js");
    const header = document.querySelector(".site-header");
    const onScroll = () => header?.classList.toggle("scrolled", window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );
    document.querySelectorAll(".reveal:not(.visible)").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [pathname]);

  return null;
}
