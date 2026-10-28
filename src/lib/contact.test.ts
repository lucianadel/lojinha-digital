import { afterEach, describe, expect, it, vi } from "vitest";
import { getContactLink } from "./contact";

describe("canais de contato configurados", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("não inventa um destino sem configuração", () => {
    expect(getContactLink("Solicitação", "", "")).toBeNull();
    expect(getContactLink("Solicitação", "email inválido", "123")).toBeNull();
  });
  it("usa o e-mail real confirmado pela proprietária sem depender de variáveis da Vercel", () => {
    vi.stubEnv("VITE_CONTACT_WHATSAPP", "");
    expect(getContactLink("Solicitação")).toBe("mailto:vendasoline502510@gmail.com?subject=Solicita%C3%A7%C3%A3o");
  });
  it("usa e-mail configurado e codifica o assunto", () => {
    expect(getContactLink("Livro & música?", "test@example.test", "")).toBe("mailto:test@example.test?subject=Livro%20%26%20m%C3%BAsica%3F");
  });
  it("recusa parâmetros injetados no endereço", () => {
    expect(getContactLink("Livro", "test@example.test?bcc=other@example.test", "")).toBeNull();
  });
  it("prepara WhatsApp somente com um número fornecido, preservando sua configuração", () => {
    const fixtureNumber = "12345678901";
    expect(getContactLink("Livro", "test@example.test", fixtureNumber)).toBe(`https://wa.me/${fixtureNumber}?text=Livro`);
  });
});
