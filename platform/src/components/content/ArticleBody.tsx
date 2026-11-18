import type { ReactNode } from "react";
import Markdown from "react-markdown";

// A heading's anchor: "1. Listing duties instead of achievements" → "listing-duties-instead-of-achievements"
export function headingId(text: string): string {
  return text
    .toLowerCase()
    .replace(/^[\d.\s]+/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// The article's "##" headings, for the contents list beside it
export function articleHeadings(markdown: string): { id: string; text: string }[] {
  return markdown
    .split("\n")
    .filter((line) => /^##\s+/.test(line))
    .map((line) =>
      line
        .replace(/^##\s+/, "")
        .replace(/[*_`]/g, "")
        .trim(),
    )
    .filter(Boolean)
    .map((text) => ({ id: headingId(text), text: text.replace(/^[\d.\s]+/, "") }));
}

const textOf = (node: ReactNode): string =>
  typeof node === "string" || typeof node === "number"
    ? String(node)
    : Array.isArray(node)
      ? node.map(textOf).join("")
      : "";

// Career tips are written in Markdown. react-markdown builds React elements (no raw HTML),
// so text typed in the admin can never inject scripts into the page.
export function ArticleBody({ markdown }: { markdown: string }) {
  return (
    <div className="prose">
      <Markdown components={{ h2: ({ children }) => <h2 id={headingId(textOf(children))}>{children}</h2> }}>
        {markdown}
      </Markdown>
    </div>
  );
}
