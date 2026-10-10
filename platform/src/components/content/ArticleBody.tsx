import Markdown from "react-markdown";

// Career tips are written in Markdown. react-markdown builds React elements (no raw HTML),
// so text typed in the admin can never inject scripts into the page.
export function ArticleBody({ markdown }: { markdown: string }) {
  return (
    <div className="prose">
      <Markdown>{markdown}</Markdown>
    </div>
  );
}
