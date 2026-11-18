import Link from "next/link";
import { Icon } from "@/components/icons/Icon";
import type { IconName } from "@/components/icons/IconSprite";

export type ServiceDetailProps = {
  id: string;
  icon: IconName;
  title: string;
  // Label for the jump links at the top of the Services page
  shortTitle: string;
  text: string;
  ticks: string[];
  meta: { label: string; value: string; href?: string }[];
  action: { label: string; href: string };
  secondary?: { label: string; href: string };
  showSamples?: boolean;
  image: { src: string; alt: string };
  flip?: boolean;
  // Its number on the page, "01" onwards
  n?: number;
};

// One service: what it is, what's included, price and turnaround, and a photo from the desk
export function ServiceDetail(props: ServiceDetailProps) {
  const secondary = props.secondary ?? (props.showSamples ? { label: "See samples", href: "/samples" } : null);
  return (
    <article className={props.flip ? "service-detail flip" : "service-detail"} id={props.id}>
      <div>
        {props.n !== undefined && <span className="n">{String(props.n).padStart(2, "0")}</span>}
        <h2>{props.title}</h2>
        <p className="intro">{props.text}</p>
        <ul className="ticks">
          {props.ticks.map((tick) => (
            <li key={tick}>
              <Icon name="check" size={16} />
              {tick}
            </li>
          ))}
        </ul>
        <div className="service-meta">
          {props.meta.map((item) => (
            <div key={item.label}>
              <span>{item.label}</span>
              <b>{item.href ? <Link href={item.href}>{item.value}</Link> : item.value}</b>
            </div>
          ))}
        </div>
        <div className="acts">
          <Link className="btn btn-primary" href={props.action.href}>
            {props.action.label}
          </Link>
          {secondary && (
            <Link className="btn btn-ghost" href={secondary.href}>
              {secondary.label}
            </Link>
          )}
        </div>
      </div>
      <figure className="service-media">
        <img src={props.image.src} alt={props.image.alt} loading="lazy" />
      </figure>
    </article>
  );
}
