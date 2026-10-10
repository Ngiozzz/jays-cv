// Contact helpers built from the business's own WhatsApp number (a Business setting, never hard-coded)

// "0725 912 186" → "254725912186", the form wa.me and tel: links need
export function whatsappDigits(number: string): string {
  const digits = number.replace(/\D/g, "");
  if (digits.startsWith("254")) return digits;
  if (digits.startsWith("0")) return `254${digits.slice(1)}`;
  return digits;
}

export function whatsappLink(number: string, message?: string): string {
  const base = `https://wa.me/${whatsappDigits(number)}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

// "254725912186" → "(+254) 725 912 186"
export function displayPhone(number: string): string {
  const d = whatsappDigits(number);
  return `(+${d.slice(0, 3)}) ${d.slice(3, 6)} ${d.slice(6, 9)} ${d.slice(9)}`.trim();
}
