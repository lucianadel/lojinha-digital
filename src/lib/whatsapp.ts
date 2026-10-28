// Business number explicitly supplied by the store owner.
export const DEFAULT_SALES_WHATSAPP_NUMBER = "5521992530081";

// Format validation cannot confirm registration/ownership of a WhatsApp account.
export function normalizeWhatsAppNumber(value: string | null | undefined): string | null {
  const raw = (value ?? "").trim();
  if (!/^\+?[\d\s()-]+$/.test(raw)) return null;
  const number = raw.replace(/[\s()-]/g, "").replace(/^\+/, "");
  if (!/^[1-9]\d{7,14}$/.test(number) || /^(\d)\1+$/.test(number)) return null;
  return number;
}

export function isValidWhatsAppNumber(value: string | null | undefined): boolean {
  return normalizeWhatsAppNumber(value) !== null;
}
