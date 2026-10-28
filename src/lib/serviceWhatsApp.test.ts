import { afterEach, describe, expect, it, vi } from "vitest";
import { bookQuoteMessage, musicOrderMessage, getServiceWhatsAppLink, normalizeWhatsAppNumber } from "./serviceWhatsApp";

// Synthetic format fixtures used only in tests; never a configured business number.
const fixtureNumber = "5511987654321";
afterEach(() => vi.unstubAllEnvs());

describe("número internacional de atendimento", () => {
  it.each([fixtureNumber, "+55 (11) 98765-4321", "  +55 (11) 98765-4321  ", "+55\u00a0(11)\u00a098765-4321"])("normaliza %s", value => {
    expect(normalizeWhatsAppNumber(value)).toBe(fixtureNumber);
  });
  it.each(["", "   ", "1234567", "1234567890123456", "05511987654321", "00000000000", "11111111111", "55+11987654321", "++5511987654321", "55/11/987654321", "55 11 987654321 ramal 2", "https://wa.me/5511987654321", "5511987654321?text=outra", "5511987654321&text=outra", "( ) - +", "５５１１９８７６５４３２１"])("rejeita configuração inválida %j", value => {
    expect(normalizeWhatsAppNumber(value)).toBeNull();
    expect(getServiceWhatsAppLink("Mensagem", value)).toBeNull();
  });
  it("usa apenas a variável pública de WhatsApp, sem e-mail como alternativa", () => {
    vi.stubEnv("VITE_CONTACT_WHATSAPP", "");
    vi.stubEnv("VITE_CONTACT_EMAIL", "test@example.test");
    expect(getServiceWhatsAppLink(bookQuoteMessage)).toBeNull();
    vi.stubEnv("VITE_CONTACT_WHATSAPP", "+55 (11) 98765-4321");
    expect(getServiceWhatsAppLink(bookQuoteMessage)).toBe(`https://wa.me/${fixtureNumber}?text=${encodeURIComponent(bookQuoteMessage)}`);
  });
  it("codifica acentos, quebras e caracteres reservados sem criar parâmetros extras", () => {
    const message = "Olá!\n\nNome: & ? + # = % Música 🎵";
    const href = getServiceWhatsAppLink(message, fixtureNumber)!;
    expect(href).toBe(`https://wa.me/${fixtureNumber}?text=${encodeURIComponent(message)}`);
    const url = new URL(href);
    expect([...url.searchParams.keys()]).toEqual(["text"]);
    expect(url.searchParams.get("text")).toBe(message);
  });
});

describe("mensagens solicitadas para os serviços", () => {
  it("preserva integralmente a mensagem do orçamento de livro", () => {
    expect(bookQuoteMessage).toBe([
      "Olá! Vim pela Lojinha Digital e gostaria de solicitar um orçamento para criar meu livro ou e-book.", "",
      "Meu nome:", "Tipo de projeto: Livro ou e-book", "Tema ou história que desejo transformar em livro:",
      "Público para quem será criado:", "Prazo desejado (se houver):", "",
      "Gostaria de saber como funciona a criação e receber um orçamento.",
    ].join("\n"));
  });
  it("preserva integralmente a mensagem da música Vozyx Studio", () => {
    expect(musicOrderMessage).toBe([
      "Olá! Vim pela Lojinha Digital e quero encomendar uma música personalizada da Vozyx Studio.", "",
      "Meu nome:", "Para quem será a música:", "Ocasião especial:", "História ou mensagem que quero transmitir:",
      "Estilo musical preferido (se houver):", "Data desejada (se houver):", "",
      "Gostaria de conhecer os valores e como funciona a encomenda.",
    ].join("\n"));
  });
});
