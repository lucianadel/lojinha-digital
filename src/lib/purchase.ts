import type { ProductInput } from "../types";
import { descriptionToText, formatPrice, isValidHotmartUrl } from "./format";
import { normalizeWhatsAppNumber } from "./whatsapp";
import { isKidsProduct } from "./kids";

export { DEFAULT_SALES_WHATSAPP_NUMBER, isValidWhatsAppNumber, normalizeWhatsAppNumber } from "./whatsapp";

export function getPurchase(product: Pick<ProductInput, "title" | "price" | "purchase_method" | "hotmart_url" | "whatsapp_number"> & Partial<Pick<ProductInput, "slug">>) {
  const method = product.purchase_method ?? "hotmart";
  const label = method === "whatsapp" ? "Comprar pelo WhatsApp" : "Comprar agora";
  let href: string | null = null;
  const number = normalizeWhatsAppNumber(product.whatsapp_number);
  if (method === "whatsapp" && number && Number.isFinite(product.price) && product.price >= 0) {
    const priceText = formatPrice(product.price).replace(/\u00a0/g, " ");
    const message = isKidsProduct(product)
      ? `Olá! Vim pela Lojinha Digital e gostaria de comprar o ${descriptionToText(product.title)}, no valor de ${priceText}. Como faço o pagamento para receber meu material em PDF?`
      : `Olá! Vim pela Lojinha Digital e gostaria de comprar o produto ${descriptionToText(product.title)}, pelo valor anunciado de ${priceText}. Como faço o pagamento e recebo o PDF?`;
    href = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
  } else if (method === "hotmart" && isValidHotmartUrl(product.hotmart_url)) {
    href = product.hotmart_url!.trim();
  }
  return { method, label, href };
}
