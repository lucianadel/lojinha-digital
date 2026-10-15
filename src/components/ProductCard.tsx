import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { formatPrice } from "../lib/format";
import type { Product } from "../types";

export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="product-card">
      <Link className="product-image-wrap" to={`/produto/${product.slug}`} aria-label={`Ver ${product.title}`}>
        {product.cover_url ? <img src={product.cover_url} alt={product.cover_alt || product.title} loading="lazy" /> : <div className="cover-fallback" aria-label="Capa não disponível"><span>ld.</span></div>}
        {product.featured && <span className="product-badge">queridinho</span>}
      </Link>
      <div className="product-info">
        {product.category && <span className="eyebrow">{product.category.name}</span>}
        <h3><Link to={`/produto/${product.slug}`}>{product.title}</Link></h3>
        <p>{product.short_description}</p>
        <div className="product-card-bottom"><strong>{formatPrice(product.price)}</strong><Link to={`/produto/${product.slug}`} aria-label={`Conhecer ${product.title}`} className="round-link"><ArrowUpRight size={18} /></Link></div>
      </div>
    </article>
  );
}
