
import { describe, expect, it } from "vitest";
import { getPurchase, isValidWhatsAppNumber, normalizeWhatsAppNumber } from "./purchase";

describe("purchase destinations", () => {
  it("normalizes accepted phone punctuation", () => {
    expect(normalizeWhatsAppNumber("+55 (11) 99999-9999")).toBe("5511999999999");
  });
  it.each(["", "0123456789", "1234567", "1234567890123456", "55abc11999999999", "55/11999999999"])("rejects invalid number %s", (value) => {
    expect(isValidWhatsAppNumber(value)).toBe(false);
  });
  it.each(["hotmart", "whatsapp"] as const)("disables an empty %s destination", (method) => {
    expect(getPurchase({ title: "Produto", price: 19.9, purchase_method: method, hotmart_url: null, whatsapp_number: null }).href).toBeNull();
  });
  it("keeps legacy products on their original Hotmart URL even when a number exists", () => {
    expect(getPurchase({ title: "Antigo", price: 19.9, hotmart_url: "https://pay.hotmart.com/ORIGINAL", whatsapp_number: "5521992530081" }))
      .toEqual({ method: "hotmart", label: "Comprar agora", href: "https://pay.hotmart.com/ORIGINAL" });
  });
  it("uses the product's actual title, price and number in the WhatsApp message", () => {
    const purchase = getPurchase({ title: "**Desenhos para Colorir** & ideias", price: 29.36, purchase_method: "whatsapp", hotmart_url: "https://pay.hotmart.com/ORIGINAL", whatsapp_number: "+55 (21) 99253-0081" });
    const url = new URL(purchase.href!);
    expect(url.origin + url.pathname).toBe("https://wa.me/5521992530081");
    expect(url.searchParams.get("text")).toBe("Olá! Vim pela Lojinha Digital e gostaria de comprar o produto Desenhos para Colorir & ideias, pelo valor anunciado de R$ 29,36. Como faço o pagamento e recebo o PDF?");
    expect([...url.searchParams.keys()]).toEqual(["text"]);
  });
  it.each(["http://pay.hotmart.com/X", "https://hotmart.com.evil.test/X", "https://evil.test", "javascript:alert(1)"])("rejects invalid Hotmart URL %s without falling back to WhatsApp", hotmart_url => {
    expect(getPurchase({ title: "Produto", price: 19.9, purchase_method: "hotmart", hotmart_url, whatsapp_number: "5521992530081" }).href).toBeNull();
  });
  it.each([NaN, Infinity, -1])("disables WhatsApp with invalid price %s", price => {
    expect(getPurchase({ title: "Produto", price, purchase_method: "whatsapp", hotmart_url: null, whatsapp_number: "5521992530081" }).href).toBeNull();
  });
});
