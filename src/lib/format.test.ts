import { describe, expect, it } from "vitest";
import { descriptionToText, formatPrice, isValidHotmartUrl, slugify } from "./format";

describe("format helpers", () => {
  it("displays headings, emphasis and lists as plain description text", () => {
    expect(descriptionToText("# Meu planner\n\n**Organize** sua rotina\n- Item __incluído__\n- *Dica* e _exemplo_"))
      .toBe("Meu planner\n\nOrganize sua rotina\n• Item incluído\n• Dica e exemplo");
  });

  it("preserves line breaks and ordinary punctuation", () => {
    expect(descriptionToText("Linha 1\r\n\r\nLinha 2\rLinha 3"))
      .toBe("Linha 1\n\nLinha 2\nLinha 3");
    expect(descriptionToText("C# e #organização; arquivo_final; 2 * 3; R$ 19,90"))
      .toBe("C# e #organização; arquivo_final; 2 * 3; R$ 19,90");
  });

  it("shows link labels and code as text without creating HTML", () => {
    expect(descriptionToText("[Material](https://example.com) e `exemplo` ~~antigo~~"))
      .toBe("Material e exemplo antigo");
    expect(descriptionToText('<script>alert("x")</script>')).toBe('<script>alert("x")</script>');
  });

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
