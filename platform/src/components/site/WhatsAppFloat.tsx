// A quiet tab in the corner, not a pulsing green ball
export function WhatsAppFloat({ href }: { href: string }) {
  return (
    <a className="wa-float" href={href} target="_blank" rel="noopener" aria-label="Chat with us on WhatsApp">
      <span className="dot" aria-hidden="true"></span>
      Chat with us
    </a>
  );
}
