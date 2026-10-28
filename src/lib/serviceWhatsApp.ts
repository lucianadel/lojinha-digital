import { DEFAULT_SALES_WHATSAPP_NUMBER, normalizeWhatsAppNumber } from "./whatsapp";
export { normalizeWhatsAppNumber } from "./whatsapp";

export const bookQuoteMessage = `Olá! Vim pela Lojinha Digital e gostaria de solicitar um orçamento para criar meu livro ou e-book.

Meu nome:
Tipo de projeto: Livro ou e-book
Tema ou história que desejo transformar em livro:
Público para quem será criado:
Prazo desejado (se houver):

Gostaria de saber como funciona a criação e receber um orçamento.`;

export const musicOrderMessage = `Olá! Vim pela Lojinha Digital e quero encomendar uma música personalizada da Vozyx Studio.

Meu nome:
Para quem será a música:
Ocasião especial:
História ou mensagem que quero transmitir:
Estilo musical preferido (se houver):
Data desejada (se houver):

Gostaria de conhecer os valores e como funciona a encomenda.`;

export function getServiceWhatsAppLink(message: string, configuredNumber = import.meta.env.VITE_CONTACT_WHATSAPP ?? DEFAULT_SALES_WHATSAPP_NUMBER): string | null {
  const number = normalizeWhatsAppNumber(configuredNumber);
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : null;
}
