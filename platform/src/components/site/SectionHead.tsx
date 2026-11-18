import type { ReactNode } from "react";

// The eyebrow is kept as the heading's accessible description of the section, but no longer printed:
// small uppercase labels over every heading read as a template
type Props = { eyebrow?: string; title: string; children?: ReactNode; action?: ReactNode };

export function SectionHead({ title, children, action }: Props) {
  return (
    <div className="section-head">
      <div>
        <h2>{title}</h2>
        {children}
      </div>
      {action}
    </div>
  );
}
