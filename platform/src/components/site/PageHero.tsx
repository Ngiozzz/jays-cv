import Link from "next/link";
import { Fragment, type ReactNode } from "react";

export type Crumb = { href?: string; label: string };

type Props = { crumbs: Crumb[]; title: string; lead: string; children?: ReactNode };

export function PageHero({ crumbs, title, lead, children }: Props) {
  return (
    <section className="page-hero">
      <div className="container">
        <Breadcrumb crumbs={crumbs} />
        <h1>{title}</h1>
        <p className="lead">{lead}</p>
        {children}
      </div>
    </section>
  );
}

export function Breadcrumb({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav className="breadcrumb" aria-label="Breadcrumb">
      <Link href="/">Home</Link>
      {crumbs.map((crumb) => (
        <Fragment key={crumb.label}>
          <span>/</span>
          {crumb.href ? <Link href={crumb.href}>{crumb.label}</Link> : <span>{crumb.label}</span>}
        </Fragment>
      ))}
    </nav>
  );
}
