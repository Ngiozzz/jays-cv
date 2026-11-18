import type { Metadata } from "next";
import { IconSprite } from "@/components/icons/IconSprite";
// The admin still builds on the old website stylesheet until the admin redesign replaces it
import "@/styles/legacy-site.css";
import "@/styles/admin.css";

// The admin is private: keep every screen out of search engines
export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | Jay CVS admin" },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return (
    <>
      {children}
      <IconSprite />
    </>
  );
}
