import { Icon } from "@/components/icons/Icon";

export function WhatsAppFloat({ href }: { href: string }) {
  return (
    <a className="wa-float" href={href} target="_blank" rel="noopener" aria-label="Chat with us on WhatsApp">
      <Icon name="whatsapp" />
    </a>
  );
}
