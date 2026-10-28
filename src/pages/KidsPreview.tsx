import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import catalog from "../data/kidsPreview.json";
import { formatPrice } from "../lib/format";
import { normalizeKidsKey } from "../lib/kids";
import { usePageMeta } from "../hooks/usePageMeta";
import "../kids.css";

export function KidsPreview() {
  usePageMeta("Prévia — Lojinha Digital Kids", "Demonstração dos 63 kits pedagógicos, com capas e preços sugeridos. Sem compra disponível.");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const products = useMemo(() => catalog.products.filter(product =>
    (!category || product.category_slug === category) &&
    normalizeKidsKey(`${product.title} ${product.category_name} ${product.content_summary}`).includes(normalizeKidsKey(query))
  ), [query, category]);
  return <>
    <header className="public-container kids-intro">
      <span className="store-kicker">PRÉVIA PARA REVISÃO · SEM COMPRA DISPONÍVEL</span>
      <h1>Lojinha Digital Kids<br /><span>Aprender, Colorir e Descobrir</span></h1>
      <p>63 kits pedagógicos com 31.693 atividades para aprender brincando, em casa e na sala de aula.</p>
      <div className="kids-preview-notice"><strong>Este é um catálogo demonstrativo.</strong> Os kits estão preparados como rascunhos, ainda não cadastrados ou publicados por esta prévia. Os preços são sugestões para aprovação. Não é possível comprar nesta página.</div>
      <p>Conteúdo de acervo PLR licenciado e não exclusivo. As capas utilizam ilustrações dos próprios materiais. Nenhum PDF completo está disponível nesta prévia.</p>
    </header>
    <section className="public-container kids-preview-catalog" aria-labelledby="kids-preview-heading">
      <h2 id="kids-preview-heading">Conheça os kits</h2>
      <div className="kids-preview-filters">
        <label>Pesquisar kits<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Nome ou tema do kit" /></label>
        <label>Categoria<select aria-label="Categoria" value={category} onChange={event => setCategory(event.target.value)}><option value="">Todas as categorias</option>{catalog.categories.map(item => <option key={item.slug} value={item.slug}>{item.name}</option>)}</select></label>
      </div>
      <p role="status">{products.length} {products.length === 1 ? "kit encontrado" : "kits encontrados"} · Preços sugeridos · Rascunhos</p>
      <div className="kids-preview-grid">{products.map(product => <article className="catalog-card kids-preview-card" key={product.slug}>
        <div className="kids-preview-cover"><img src={`/kids-preview/covers/${product.slug}.png`} alt={product.cover_alt} width="1200" height="1600" loading="lazy" decoding="async" /></div>
        <div className="catalog-card-copy"><span className="catalog-category">{product.category_name}</span><h3>{product.title}</h3><p>{product.short_description}</p>
          <p className="kids-preview-price"><strong>{formatPrice(product.price)}</strong><span>Preço sugerido · Rascunho</span></p>
          <details><summary>Ver detalhes: {product.title}</summary><p>{product.content_summary}</p><p>{product.activities} atividades · {product.age} · PDF para impressão em A4.</p><p>Após aprovação e publicação, a compra será pelo WhatsApp, com pagamento combinado no atendimento e entrega manual do PDF após confirmação.</p>{product.slug === "kids-corpo-humano-para-colorir" && <p>Se este kit já estiver cadastrado por R$ 5,90, o preço promocional será preservado. A prévia não altera produtos existentes.</p>}<p>Prévia sem compra disponível. Não inclui impressão física.</p></details>
        </div>
      </article>)}</div>
      {products.length === 0 && <p>Nenhum kit corresponde à pesquisa. Experimente outro termo ou categoria.</p>}
    </section>
    <aside className="public-container kids-information"><p>Antes da publicação: aprovar capas e preços, confirmar as versões de Bingo de Figuras e Jogo da Memória e conferir duplicações com acesso administrativo. Nenhum cadastro remoto foi feito.</p><Link className="store-text-link" to="/loja">Ver os produtos já disponíveis na loja</Link></aside>
  </>;
}
