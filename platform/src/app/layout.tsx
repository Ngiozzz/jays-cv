import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "@/styles/site.css";

// Brand fonts (see the brand guide): Inter for text, Playfair Display for headings
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Jay CVS", template: "%s | Jay CVS" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body>{children}</body>
    </html>
  );
}
