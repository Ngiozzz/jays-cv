import type { CSSProperties } from "react";
import { Icon } from "@/components/icons/Icon";

type Props = { draftTime: string; style?: CSSProperties };

export function HeroFacts({ draftTime, style }: Props) {
  return (
    <ul className="hero-facts" style={style}>
      <li>
        <Icon name="clock" /> Draft in {draftTime}
      </li>
      <li>
        <Icon name="refresh" /> Free revisions
      </li>
      <li>
        <Icon name="phone" /> Pay via M-Pesa
      </li>
    </ul>
  );
}
