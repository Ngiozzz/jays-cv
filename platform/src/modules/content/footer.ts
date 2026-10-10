import type { BusinessSettings } from "@/generated/prisma/client";
import { displayPhone, whatsappDigits } from "./contact";

export type SocialName = "linkedin" | "facebook" | "instagram" | "x";

export type FooterContact = {
  phoneHref: string;
  phoneText: string;
  email: string;
  address: string;
  paybill: string;
  socials: { name: SocialName; label: string; href: string | null }[];
};

// Social links only appear once the owner has filled them in
export function footerContact(settings: BusinessSettings): FooterContact {
  return {
    phoneHref: `tel:+${whatsappDigits(settings.whatsapp)}`,
    phoneText: displayPhone(settings.whatsapp),
    email: settings.email,
    address: settings.address,
    paybill: settings.paybill,
    socials: [
      { name: "linkedin", label: "LinkedIn", href: settings.linkedinUrl },
      { name: "facebook", label: "Facebook", href: settings.facebookUrl },
      { name: "instagram", label: "Instagram", href: settings.instagramUrl },
      { name: "x", label: "X (Twitter)", href: settings.xUrl },
    ],
  };
}
