import { demoCategories, demoProducts } from "../data/demo";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import type { Category, Product, ProductInput } from "../types";

export const isDemoMode = !isSupabaseConfigured;

export async function getCategories(): Promise<Category[]> {
  if (!supabase) return demoCategories;
  const { data, error } = await supabase.from("categories").select("*").order("name");
  if (error) throw error;
  return data as Category[];
}

export async function getPublishedProducts(): Promise<Product[]> {
  if (!supabase) return demoProducts;
  const { data, error } = await supabase.from("products")
    .select("*, category:categories(*)").eq("status", "published").order("created_at", { ascending: false });
  if (error) throw error;
  return data as Product[];
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  if (!supabase) return demoProducts.find((product) => product.slug === slug) ?? null;
  const { data, error } = await supabase.from("products")
    .select("*, category:categories(*)").eq("slug", slug).eq("status", "published").maybeSingle();
  if (error) throw error;
  return data as Product | null;
}

export async function getAdminProducts(): Promise<Product[]> {
  if (!supabase) throw new Error("Configure o Supabase para acessar o painel administrativo.");
  const { data, error } = await supabase.from("products")
    .select("*, category:categories(*)").order("created_at", { ascending: false });
  if (error) throw error;
  return data as Product[];
}

export async function saveProduct(input: ProductInput, id?: string): Promise<Product> {
  if (!supabase) throw new Error("Configure o Supabase para salvar produtos.");
  const query = id
    ? supabase.from("products").update(input).eq("id", id)
    : supabase.from("products").insert(input);
  const { data, error } = await query.select("*, category:categories(*)").single();
  if (error) throw error;
  return data as Product;
}

export async function deleteProduct(id: string): Promise<void> {
  if (!supabase) throw new Error("Configure o Supabase para excluir produtos.");
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw error;
}

export async function saveCategory(input: Pick<Category, "name" | "slug" | "description">): Promise<Category> {
  if (!supabase) throw new Error("Configure o Supabase para salvar categorias.");
  const { data, error } = await supabase.from("categories").insert(input).select().single();
  if (error) throw error;
  return data as Category;
}

export async function uploadCover(file: File): Promise<string> {
  if (!supabase) throw new Error("Configure o Supabase para enviar capas.");
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
    throw new Error("Use uma imagem JPG, PNG ou WebP de até 5 MB.");
  }
  const signature = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const isJpeg = signature[0] === 0xff && signature[1] === 0xd8 && signature[2] === 0xff;
  const isPng = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((byte, index) => signature[index] === byte);
  const isWebp = String.fromCharCode(...signature.slice(0, 4)) === "RIFF"
    && String.fromCharCode(...signature.slice(8, 12)) === "WEBP";
  if ((file.type === "image/jpeg" && !isJpeg)
    || (file.type === "image/png" && !isPng)
    || (file.type === "image/webp" && !isWebp)) {
    throw new Error("O conteúdo do arquivo não corresponde ao formato de imagem informado.");
  }
  const extension = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
  const path = `${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from("product-covers").upload(path, file, {
    cacheControl: "3600", contentType: file.type, upsert: false,
  });
  if (error) throw error;
  return supabase.storage.from("product-covers").getPublicUrl(path).data.publicUrl;
}
