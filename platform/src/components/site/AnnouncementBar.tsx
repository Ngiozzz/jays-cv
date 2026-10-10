import Link from "next/link";

type Props = { text: string; link: string };

export function AnnouncementBar({ text, link }: Props) {
  return (
    <div id="announce" className="announce-bar">
      <span>📣 {text}</span>
      {link && (
        <>
          {" "}
          <Link href={link}>Learn more →</Link>
        </>
      )}
    </div>
  );
}
