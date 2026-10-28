import type { ProductInput } from "../types";
import { isValidHotmartUrl } from "./format";

export function normalizeWhatsAppNumber(value: string | null | undefined): string {
  return (value ?? "").replace(/[\s()+-]/g, "");
}

export function isValidWhatsAppNumber(value: string | null | undefined): boolean {
  return /^[1-9][0-9]{7,14}$/.test(normalizeWhatsAppNumber(value));
}

export function getPurchase(product: Pick<ProductInput, "title" | "purchase_method" | "hotmart_url" | "whatsapp_number">) {
  const method = product.purchase_method ?? "hotmart";
  const label = method === "whatsapp" ? "Comprar pelo WhatsApp" : "Comprar agora pela Hotmart";
  let href: string | null = null;
  if (method === "whatsapp" && isValidWhatsAppNumber(product.whatsapp_number)) {
    href = `https://wa.me/${normalizeWhatsAppNumber(product.whatsapp_number)}?text=${encodeURIComponent(`Olá! Quero comprar o produto: ${product.title}.`)}`;
  } else if (method === "hotmart" && isValidHotmartUrl(product.hotmart_url)) {
    href = product.hotmart_url!.trim();
  }
  return { method, label, href };
}
