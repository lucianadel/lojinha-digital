import catalog from "../data/kidsImport.json";
import type { Category, Product, ProductInput } from "../types";

export const kidsImportCatalog = catalog;
export const importKey = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
export type ImportKit = typeof catalog.products[number];
export function createKidsPlan(products: Product[], categories: Category[]) {
  const entries = catalog.products.map(kit => {
    const exact = products.filter(p => kit.match_keys.includes(importKey(p.title)) || kit.match_keys.includes(importKey(p.slug)));
    const possible = products.filter(p => !exact.includes(p) && kit.review_keys.some(k => importKey(p.title).includes(k) || importKey(p.slug).includes(k)));
    return {kit, existing:exact, possible};
  });
  const categoryEntries = catalog.categories.map(category => {
    const matches = categories.filter(c => category.match_keys.includes(importKey(c.name)) || category.match_keys.includes(importKey(c.slug)));
    const possible = categories.filter(c => !matches.includes(c) && category.match_keys.some(key => importKey(c.name).includes(key) || importKey(c.slug).includes(key)));
    return {category, matches, possible};
  });
  const conflicts = entries.filter(e => e.existing.length > 1 || e.possible.length > 0).map(e => e.kit.title);
  categoryEntries.filter(e => e.matches.length > 1 || e.possible.length > 0).forEach(e => conflicts.push(`Categoria: ${e.category.name}`));
  return {entries,categoryEntries,conflicts,newCount:entries.filter(e=>e.existing.length===0).length,existingCount:entries.filter(e=>e.existing.length>0).length};
}
export function kidsDraftInput(kit: ImportKit, categoryId: string, coverUrl: string): ProductInput {
  if (!categoryId || !coverUrl.startsWith("https://")) throw new Error("Categoria ou capa inválida.");
  const expected = kit.activities <= 80 ? 9.9 : kit.activities <= 200 ? 14.9 : 19.9;
  if (kit.price !== expected) throw new Error("Preço fora do catálogo aprovado.");
  return {title:kit.title,slug:kit.slug,short_description:kit.short_description,description:kit.description,category_id:categoryId,price:kit.price,cover_url:coverUrl,cover_alt:kit.cover_alt,purchase_method:"whatsapp",whatsapp_number:"5521992530081",hotmart_url:null,status:"draft",featured:false};
}
