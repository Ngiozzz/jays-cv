import type { ReactNode } from "react";

type Props = { eyebrow: string; title: string; children?: ReactNode; action?: ReactNode };

export function SectionHead({ eyebrow, title, children, action }: Props) {
  const heading = (
    <>
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      {children}
    </>
  );
  if (!action) return <div className="section-head">{heading}</div>;
  return (
    <div className="section-head section-head-row">
      <div>{heading}</div>
      {action}
    </div>
  );
}
