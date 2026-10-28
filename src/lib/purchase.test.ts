
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
    expect(getPurchase({ title: "Produto", purchase_method: method, hotmart_url: null, whatsapp_number: null }).href).toBeNull();
  });
});
