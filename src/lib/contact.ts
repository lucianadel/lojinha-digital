// Public business contact confirmed by the store owner; this is not a credential.
export const serviceContactEmail = "vendasoline502510@gmail.com";

export function getContactLink(subject: string, email = serviceContactEmail, whatsapp = import.meta.env.VITE_CONTACT_WHATSAPP ?? ""): string | null {
  const number = whatsapp.trim().replace(/[\s()+-]/g, "");
  if (/^[1-9]\d{7,14}$/.test(number)) return `https://wa.me/${number}?text=${encodeURIComponent(subject)}`;
  const address = email.trim();
  if (/^[^\s@?&#]+@[^\s@?&#]+\.[^\s@?&#]+$/.test(address)) return `mailto:${address}?subject=${encodeURIComponent(subject)}`;
  return null;
}
