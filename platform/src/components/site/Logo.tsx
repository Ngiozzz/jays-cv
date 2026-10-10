import Link from "next/link";

type Props = { light?: boolean };

export function Logo({ light = false }: Props) {
  return (
    <Link href="/" className={light ? "logo logo-light" : "logo"} aria-label="Jay CVS home">
      <span className="logo-mark">J</span>
      <span className="logo-text">
        Jay<strong>CVS</strong>
      </span>
    </Link>
  );
}
