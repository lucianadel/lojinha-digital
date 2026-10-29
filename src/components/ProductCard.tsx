import { getPurchase } from "../lib/purchase";
import { ArrowRight, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { descriptionToText, formatPrice } from "../lib/format";
import type { Product } from "../types";

export function ProductCard({ product }: { product: Product }) {
  const purchase = getPurchase(product);
  const title = descriptionToText(product.title);
  return <article className="catalog-card">
    <Link className="catalog-cover" to={`/produto/${product.slug}`} aria-label={`Ver ${title}`}>
      {product.cover_url ? <img src={product.cover_url} alt={product.cover_alt || title} loading="lazy" decoding="async" /> : <div className="catalog-cover-empty"><BookOpen size={36} aria-hidden="true" /><span>Capa não disponível</span></div>}
    </Link>
    <div className="catalog-card-copy">
      <span className="catalog-category">{descriptionToText(product.category?.name ?? "Produto digital")}</span>
      <h3><Link to={`/produto/${product.slug}`}>{title}</Link></h3>
      <p>{descriptionToText(product.short_description)}</p>
      <div className="catalog-card-action"><strong>{formatPrice(product.price)}</strong><Link to={`/produto/${product.slug}`} className="store-button store-button-outline" aria-label={`Ver produto: ${title}`}>Ver produto <ArrowRight size={16} aria-hidden="true" /></Link></div>
      {purchase.method === "mercado_pago" && purchase.href && <Link className="store-button store-button-primary" to={purchase.href}>{purchase.label}</Link>}
    </div>
  </article>;
}
