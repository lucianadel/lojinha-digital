import { describe, expect, it } from "vitest";
import { isKidsProduct, kidsCategoryFor, KIDS_CATEGORIES } from "./kids";
import { getPurchase } from "./purchase";
import collection from "../data/kidsCollection.json";
describe("coleção Kids sem alterar produtos", () => {
  it("reconhece os 63 kits nas seis categorias, inclusive títulos antigos", () => { expect(collection.kits).toHaveLength(63); expect(KIDS_CATEGORIES).toHaveLength(6); for (const kit of collection.kits) { expect(isKidsProduct({title:kit.sourceTitle})).toBe(true); expect(kidsCategoryFor({title:'Título editado',slug:kit.slug})?.slug).toBe(kit.categorySlug); } });
  it("reconhece Corpo Humano sem criar um novo registro nem depender de sua categoria antiga", () => { expect(kidsCategoryFor({title:'Kit Colorir – Corpo Humano'})?.name).toBe('Desenhos para Colorir'); });
  it("não inclui os livros Hotmart gerais por coincidência de palavras", () => { expect(isKidsProduct({title:'Ainda Há Lugar Para Mim?'})).toBe(false); expect(isKidsProduct({title:'Cão Educado, Lar Feliz — Guia de Adestramento Positivo'})).toBe(false); });
  it("monta a mensagem Kids com o preço atual, inclusive R$ 5,90 preservado", () => { const href=getPurchase({title:'Kit Colorir – Corpo Humano',price:5.9,purchase_method:'whatsapp',whatsapp_number:'5521992530081',hotmart_url:null}).href!; expect(new URL(href).searchParams.get('text')).toBe('Olá! Vim pela Lojinha Digital e gostaria de comprar o Kit Colorir – Corpo Humano, no valor de R$ 5,90. Como faço o pagamento para receber meu material em PDF?'); });
  it("não troca automaticamente um kit existente de Hotmart para WhatsApp", () => { expect(getPurchase({title:'Kit Colorir – Corpo Humano',price:5.9,purchase_method:'hotmart',hotmart_url:'https://pay.hotmart.com/ORIGINAL',whatsapp_number:'5521992530081'}).href).toBe('https://pay.hotmart.com/ORIGINAL'); });
});
