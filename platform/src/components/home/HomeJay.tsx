import Link from "next/link";
import { Icon } from "@/components/icons/Icon";
import { StageTrack } from "@/components/site/StageTrack";

type Props = { name: string; role: string; lead: string; story: string; photoUrl: string | null; businessName: string };

// The first paragraph of the owner's story (Markdown), as plain text
function firstParagraph(markdown: string): string {
  const para = markdown.split(/\n\s*\n/).find((p) => p.trim() && !p.trim().startsWith("#")) ?? "";
  return para.replace(/[*_`>#]/g, "").trim();
}

// "Meet Jay": the person behind the CVs, from the About page (Website content → About page).
// Until a photo is uploaded the frame shows the initial.
export function HomeJay({ name, role, lead, story, photoUrl, businessName }: Props) {
  const intro = firstParagraph(story);
  return (
    <section className="section section-alt" id="jay">
      <div className="container jay">
        <div className="portrait">
          {photoUrl ? (
            <img src={photoUrl} alt={name} />
          ) : (
            <span className="mono-initial" aria-hidden="true">
              {(name || businessName).charAt(0)}
            </span>
          )}
          <div className="tagline">
            <div>
              <b>{name}</b>
              <span>{role}</span>
            </div>
            <StageTrack of={5} at={4} />
          </div>
        </div>
        <div className="story-text">
          <p className="kicker">The person behind the CVs</p>
          <h2>Meet {name.split(" ")[0]}</h2>
          {lead && <p>{lead}</p>}
          {intro && <p>{intro}</p>}
          <p className="sign" aria-hidden="true">
            {name.split(" ")[0]}
          </p>
          <p className="role">{role}</p>
          <Link className="link" href="/about">
            More about {businessName} <Icon name="arrow" size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}
