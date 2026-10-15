import { ArrowDown, ArrowRight, BookOpen, BriefcaseBusiness, GraduationCap, Layers3, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { ProductCard } from "../components/ProductCard";
import { EmptyState, ErrorState, LoadingState } from "../components/StoreState";
import { usePageMeta } from "../hooks/usePageMeta";
import { isDemoMode, getCategories, getPublishedProducts } from "../services/products";
import type { Category, Product } from "../types";

const categoryIcons = [BookOpen, GraduationCap, Layers3, Sparkles, BriefcaseBusiness];

export function Home() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  usePageMeta("Ideias que viram realidade", "E-books, cursos, planners e materiais digitais para tirar suas ideias do papel.");

  async function load() {
    setLoading(true); setError("");
    try {
      const [allProducts, allCategories] = await Promise.all([getPublishedProducts(), getCategories()]);
      setProducts(allProducts); setCategories(allCategories);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível carregar a loja.");
    } finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  return (
    <>
      <section className="hero">
        <div className="hero-shape hero-shape-one" /><div className="hero-shape hero-shape-two" />
        <div className="hero-content">
          <span className="pill-label"><span className="pill-dot" /> seu próximo passo começa aqui</span>
          <h1>Ideias boas<br />merecem <span>acontecer.</span></h1>
          <p>Conhecimento, ferramentas e inspiração para você criar uma rotina com mais intenção — do seu jeito.</p>
          <div className="hero-actions"><Link to="/loja" className="button button-dark">Encontre seu próximo passo <ArrowRight size={17} /></Link><a href="#categorias" className="button button-quiet">Explore a loja <ArrowDown size={15} /></a></div>
          <div className="hero-note"><div className="mini-avatars"><span>✦</span><span>✿</span><span>↗</span></div><span>Conteúdo feito para a vida real</span></div>
        </div>
        <div className="hero-art" aria-label="Caderno, livro e ferramentas criativas"><div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" /><div className="art-sun">✳</div><div className="art-card art-card-main"><div className="art-brand">LD. / 01</div><div className="art-title">pequenos<br />passos.<br /><b>grandes ideias.</b></div><div className="art-lines"><i /><i /><i /></div><div className="art-sticker">comece<br />por aqui ↗</div></div><div className="art-card art-card-back"><span>IDEIAS<br />EM AÇÃO</span><div className="back-lines" /></div><div className="art-flower">✿</div><div className="art-caption">um universo de possibilidades</div></div>
        <div className="hero-index">01 <span>/</span> 05</div>
      </section>

      {isDemoMode && <div className="demo-banner"><span>✦</span> Você está vendo uma vitrine demonstrativa. Compras não estão habilitadas.</div>}

      <section className="section category-section" id="categorias">
        <div className="section-heading"><div><span className="eyebrow">DO JEITO QUE VOCÊ PRECISA</span><h2>Por onde vamos começar?</h2></div><Link to="/loja" className="inline-link">Ver todas as categorias <ArrowRight size={16} /></Link></div>
        <div className="category-grid">
          {categories.map((category, index) => {
            const Icon = categoryIcons[index % categoryIcons.length];
            return <Link to={`/loja?categoria=${category.slug}`} className={`category-tile category-${index % 5}`} key={category.id}><span className="category-icon"><Icon size={20} /></span><span><strong>{category.name}</strong><small>{category.description}</small></span><ArrowRight className="category-arrow" size={17} /></Link>;
          })}
        </div>
      </section>

      <section className="section featured-section">
        <div className="section-heading"><div><span className="eyebrow">FEITOS PARA VOCÊ</span><h2>Ideias para colocar em prática</h2><p>Materiais escolhidos para ajudar você a avançar.</p></div><Link to="/loja" className="inline-link">Explorar a loja <ArrowRight size={16} /></Link></div>
        {loading ? <LoadingState label="Preparando a vitrine..." /> : error ? <ErrorState message={error} onRetry={() => void load()} /> : (products ?? []).some((p) => p.featured) ? <div className="product-grid">{(products ?? []).filter((p) => p.featured).slice(0, 4).map((product) => <ProductCard key={product.id} product={{ ...product, category: product.category ?? categories.find((c) => c.id === product.category_id) }} />)}</div> : <EmptyState title="Novidades em breve" text="Estamos preparando os próximos materiais digitais." />}
      </section>

      <section className="manifesto">
        <div className="manifesto-mark">✳</div><span className="eyebrow">NÃO PRECISA TER TUDO RESOLVIDO</span><h2>Você só precisa<br />do <em>próximo passo.</em></h2><p>Um bom recurso não faz o caminho por você. Ele torna o caminho mais claro, possível e seu.</p><Link to="/sobre" className="button button-dark">Conheça a Lojinha <ArrowRight size={17} /></Link><span className="manifesto-squiggle">〰</span>
      </section>
      <section className="newsletter-cta"><div><span className="eyebrow">TEM UM PROJETO EM MENTE?</span><h2>Vamos tirar do papel?</h2><p>Escolha seu material e comece hoje, no seu ritmo.</p></div><Link to="/loja" className="button button-pink">Encontrar meu próximo passo <ArrowRight size={17} /></Link><span className="cta-star">✦</span></section>
    </>
  );
}
