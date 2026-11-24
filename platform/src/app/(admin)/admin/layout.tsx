import type { Metadata } from "next";
import { IconSprite } from "@/components/icons/IconSprite";
// The website's base and shared pieces (buttons, fields, the stage track, order files, the pay box),
// then the admin's own: old token names mapped to the new palette, the screens, and the shell last
import "@/styles/site.css";
import "@/styles/site/check.css";
import "@/styles/site/order.css";
import "@/styles/admin/base.css";
import "@/styles/admin.css";
import "@/styles/admin/shell.css";

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
