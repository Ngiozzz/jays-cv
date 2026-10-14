import { Suspense } from "react";
import { IconSprite } from "@/components/icons/IconSprite";
import { AnnouncementBar } from "@/components/site/AnnouncementBar";
import { PageEffects } from "@/components/site/PageEffects";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { WhatsAppFloat } from "@/components/site/WhatsAppFloat";
import { footerContact } from "@/modules/content/footer";
import { getSiteChrome } from "@/modules/content/content.service";
import { whatsappLink } from "@/modules/content/contact";
import { allTenantSlugs, getTenant } from "@/modules/tenants/tenants.service";

// The proxy rewrites each request to /<business slug>/…, so every business's pages are built and cached separately
export async function generateStaticParams() {
  return (await allTenantSlugs()).map((tenant) => ({ tenant }));
}

export default async function PublicLayout({ children, params }: LayoutProps<"/[tenant]">) {
  const tenant = await getTenant((await params).tenant);
  const { settings, announcement } = await getSiteChrome(tenant.id);

  return (
    <>
      {announcement && <AnnouncementBar text={announcement.announcementText} link={announcement.announcementLink} />}
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <SiteHeader whatsappHref={whatsappLink(settings.whatsapp, "Hi Jay CVS, I'd like help with my CV")} />
      <main id="main">{children}</main>
      <SiteFooter contact={footerContact(settings)} businessName={tenant.name} />
      <WhatsAppFloat href={whatsappLink(settings.whatsapp, "Hi Jay CVS")} />
      <IconSprite />
      {/* Reads the URL, which a tracking link only knows at request time */}
      <Suspense fallback={null}>
        <PageEffects />
      </Suspense>
    </>
  );
}
