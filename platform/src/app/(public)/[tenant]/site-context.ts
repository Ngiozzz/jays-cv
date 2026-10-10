import { getSiteChrome } from "@/modules/content/content.service";
import { whatsappLink } from "@/modules/content/contact";
import { getTenant } from "@/modules/tenants/tenants.service";

// What every public page needs: which business it is, its settings, and the "free CV review" link
export async function siteContext(params: Promise<{ tenant: string }>) {
  const tenant = await getTenant((await params).tenant);
  const { settings } = await getSiteChrome(tenant.id);
  return {
    tenant,
    settings,
    freeReviewHref: whatsappLink(settings.whatsapp, "Hi Jay CVS, I'd like a free CV review"),
  };
}
