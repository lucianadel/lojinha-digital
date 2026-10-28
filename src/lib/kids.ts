import collection from "../data/kidsCollection.json";
import type { Category } from "../types";

export const KIDS_CATEGORIES: Category[] = collection.categories;

export function normalizeKidsKey(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

const kitCategories = new Map(collection.kits.flatMap(kit => kit.matchKeys.map(key => [key, kit.categorySlug] as const)));

export function kidsCategoryFor(product: { title: string; slug?: string }): Category | null {
  const slug = kitCategories.get(normalizeKidsKey(product.slug ?? "")) ?? kitCategories.get(normalizeKidsKey(product.title));
  return KIDS_CATEGORIES.find(category => category.slug === slug) ?? null;
}

export function isKidsProduct(product: { title: string; slug?: string }): boolean {
  return kidsCategoryFor(product) !== null;
}
