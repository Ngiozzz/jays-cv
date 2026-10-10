import { Logo } from "./Logo";
import { MainNav } from "./MainNav";

type Props = { whatsappHref: string };

export function SiteHeader({ whatsappHref }: Props) {
  return (
    <header className="site-header" id="top">
      <div className="container header-inner">
        <Logo />
        <MainNav whatsappHref={whatsappHref} />
      </div>
    </header>
  );
}
