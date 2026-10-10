import type { IconName } from "./IconSprite";

type Props = { name: IconName; size?: number; className?: string };

export function Icon({ name, size, className }: Props) {
  return (
    <svg aria-hidden="true" width={size} height={size} className={className}>
      <use href={`#i-${name}`} />
    </svg>
  );
}
