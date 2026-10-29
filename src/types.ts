export type PurchaseMethod = "hotmart" | "whatsapp" | "mercado_pago";

export type ProductSector = "digital_material" | "book";

export type ProductStatus = "draft" | "published";

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

export interface Product {
  id: string;
  title: string;
  slug: string;
  short_description: string;
  description: string;
  category_id: string;
  price: number;
  cover_url: string | null;
  cover_alt: string;
  product_sector?: ProductSector;
  digital_checkout_enabled?: boolean;
  purchase_method?: PurchaseMethod;
  whatsapp_number?: string | null;
  hotmart_url: string | null;
  featured: boolean;
  status: ProductStatus;
  created_at: string;
  category?: Category;
}

export interface ProductInput {
  title: string;
  slug: string;
  short_description: string;
  description: string;
  category_id: string;
  price: number;
  cover_url: string | null;
  cover_alt: string;
  product_sector?: ProductSector;
  digital_checkout_enabled?: boolean;
  purchase_method?: PurchaseMethod;
  whatsapp_number?: string | null;
  hotmart_url: string | null;
  featured: boolean;
  status: ProductStatus;
}
