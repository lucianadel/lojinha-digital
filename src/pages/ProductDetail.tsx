import { ArrowLeft, ArrowUpRight, Check, ShieldCheck } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { ErrorState, LoadingState } from "../components/StoreState";
import { ProductMarkdown } from "../components/ProductMarkdown";
import { usePageMeta } from "../hooks/usePageMeta";
import { descriptionToText, formatPrice } from "../lib/format";
import { getPurchase } from "../lib/purchase";
import { getCategories, getProductBySlug } from "../services/products";
import type { Category, Product } from "../types";

export function ProductDetail() {
  const { slug = "" } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  usePageMeta(product?.title ?? "Produto", product ? descriptionToText(product.short_description) : "Conheça nossos produtos digitais.");
  async function load() {
    setLoading(true); setError("");
    try {
      const [item, groups] = await Promise.all([getProductBySlug(slug), getCategories()]);
      setProduct(item); setCategories(groups);
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível carregar este produto."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, [slug]);

  if (loading) return <div className="section detail-wrap"><LoadingState label="Carregando produto..." /></div>;
  if (error) return <div className="section detail-wrap"><ErrorState message={error} onRetry={() => void load()} /></div>;
  if (!product) return <div className="section detail-wrap"><div className="not-found"><span className="eyebrow">OPA, NÃO ENCONTRAMOS</span><h1>Este produto não está por aqui.</h1><p>Talvez ele tenha mudado de endereço. Explore os outros materiais digitais.</p><Link className="button button-dark" to="/loja"><ArrowLeft size={17} /> Voltar para a loja</Link></div></div>;
  const category = product.category ?? categories.find((item) => item.id === product.category_id);
  const purchase = getPurchase(product);

  return <div className="section detail-wrap">
    <Link to="/loja" className="back-link"><ArrowLeft size={16} /> Voltar para a loja</Link>
    <article className="product-detail">
      <div className="detail-cover">{product.cover_url ? <img src={product.cover_url} alt={product.cover_alt || product.title} /> : <div className="cover-fallback"><span>ld.</span></div>}<span className="detail-cover-label">LD. / DIGITAL GOOD</span></div>
      <div className="detail-copy"><span className="eyebrow">{category?.name ?? "Material digital"}</span><h1>{product.title}</h1><div className="detail-lead"><ProductMarkdown>{product.short_description}</ProductMarkdown></div><div className="detail-rule" /><div className="detail-price"><span>Investimento</span><strong>{formatPrice(product.price)}</strong></div>
        {purchase.href ? <a className="button button-pink detail-buy" href={purchase.href} target="_blank" rel="noopener noreferrer">{purchase.label} <ArrowUpRight size={18} /></a> : <button className="button button-disabled detail-buy" type="button" disabled aria-disabled="true">Compra indisponível no momento</button>}
        <div className="secure-note"><ShieldCheck size={17} /><span>{purchase.method === "whatsapp" ? "Combine o pagamento diretamente pelo WhatsApp." : "Checkout e pagamento processados com segurança pela Hotmart."}</span></div>
        <ul className="detail-promises"><li><Check size={16} /> {purchase.method === "whatsapp" ? "Combine o acesso e a entrega pelo WhatsApp" : "Acesso e entrega pela Hotmart"}</li><li><Check size={16} /> Suporte: <a href={`mailto:${import.meta.env.VITE_CONTACT_EMAIL || "oi@lojinhadigital.com.br"}`}>{import.meta.env.VITE_CONTACT_EMAIL || "oi@lojinhadigital.com.br"}</a></li></ul>
      </div>
      <section className="detail-description" aria-label="Descrição completa">
        <ProductMarkdown>{product.description}</ProductMarkdown>
      </section>
    </article>
  </div>;
}
