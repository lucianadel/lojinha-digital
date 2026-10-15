import { describe, expect, it } from "vitest";
import { formatPrice, isValidHotmartUrl, slugify } from "./format";

describe("format helpers", () => {
  it("normalizes product slugs for readable URLs", () => {
    expect(slugify("Planner Semana Leve!")).toBe("planner-semana-leve");
    expect(slugify("  Ação & Criação  ")).toBe("acao-criacao");
  });

  it("accepts only HTTPS Hotmart checkout hosts", () => {
    expect(isValidHotmartUrl("https://pay.hotmart.com/ABC123")).toBe(true);
    expect(isValidHotmartUrl("https://hotmart.com/checkout")).toBe(true);
    expect(isValidHotmartUrl("http://pay.hotmart.com/ABC123")).toBe(false);
    expect(isValidHotmartUrl("https://hotmart.com.example.org/checkout")).toBe(false);
    expect(isValidHotmartUrl("javascript:alert(1)")).toBe(false);
    expect(isValidHotmartUrl(null)).toBe(false);
  });

  it("formats prices in Brazilian currency", () => {
    expect(formatPrice(39.9)).toBe("R$ 39,90");
  });
});
