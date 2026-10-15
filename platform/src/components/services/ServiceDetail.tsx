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
  showSamples?: boolean;
  image: { src: string; alt: string };
  flip?: boolean;
};

export function ServiceDetail(props: ServiceDetailProps) {
  return (
    <article className={props.flip ? "service-detail flip" : "service-detail"} id={props.id}>
      <div>
        <span className="icon-box">
          <Icon name={props.icon} />
        </span>
        <h2>{props.title}</h2>
        <p>{props.text}</p>
        <ul className="ticks">
          {props.ticks.map((tick) => (
            <li key={tick}>{tick}</li>
          ))}
        </ul>
        <div className="service-meta">
          {props.meta.map((item) => (
            <div key={item.label}>
              <span>{item.label}</span>
              <strong>{item.href ? <Link href={item.href}>{item.value}</Link> : item.value}</strong>
            </div>
          ))}
        </div>
        <Link className="btn btn-primary" href={props.action.href}>
          {props.action.label}
        </Link>
        {props.showSamples && (
          <>
            {" "}
            <Link className="btn btn-ghost" href="/samples">
              See samples
            </Link>
          </>
        )}
      </div>
      <div className="service-media">
        <img className="media" src={props.image.src} alt={props.image.alt} loading="lazy" />
      </div>
    </article>
  );
}
