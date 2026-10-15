import { Search, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { EmptyState, ErrorState, LoadingState } from "../components/StoreState";
import { ProductCard } from "../components/ProductCard";
import { usePageMeta } from "../hooks/usePageMeta";
import { getCategories, getPublishedProducts } from "../services/products";
import type { Category, Product } from "../types";

export function Store() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [category, setCategory] = useState(searchParams.get("categoria") ?? "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  usePageMeta("Loja", "Explore e-books, cursos, apostilas, planners e kits digitais.");

  async function load() {
    setLoading(true); setError("");
    try {
      const [items, groups] = await Promise.all([getPublishedProducts(), getCategories()]);
      setProducts(items); setCategories(groups);
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível carregar os produtos."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  useEffect(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (category) params.set("categoria", category);
    setSearchParams(params, { replace: true });
  }, [query, category, setSearchParams]);

  const filtered = useMemo(() => products.filter((product) => {
    const categoryName = categories.find((item) => item.id === product.category_id)?.name ?? "";
    const matchesQuery = `${product.title} ${product.short_description} ${categoryName}`.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR"));
    return matchesQuery && (!category || category === product.category_id || category === categories.find((item) => item.id === product.category_id)?.slug);
  }), [products, categories, query, category]);

  return <div className="store-page">
    <section className="store-intro"><span className="eyebrow">UM BOM LUGAR PARA COMEÇAR</span><h1>Encontre o que<br /><em>faz sentido para você.</em></h1><p>Recursos digitais para aprender, organizar e fazer acontecer.</p><div className="store-decoration">✳</div></section>
    <section className="section catalog-section">
      <div className="catalog-toolbar"><div className="search-field"><Search size={19} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="O que você está buscando?" aria-label="Buscar produtos" /></div><label className="filter-field"><SlidersHorizontal size={17} /><span className="sr-only">Filtrar por categoria</span><select value={category} onChange={(e) => setCategory(e.target.value)}><option value="">Todas as categorias</option>{categories.map((item) => <option value={item.slug} key={item.id}>{item.name}</option>)}</select></label></div>
      {!loading && !error && <p className="result-count">{filtered.length} {filtered.length === 1 ? "produto encontrado" : "produtos encontrados"}</p>}
      {loading ? <LoadingState label="Carregando produtos..." /> : error ? <ErrorState message={error} onRetry={() => void load()} /> : filtered.length ? <div className="product-grid">{filtered.map((product) => <ProductCard key={product.id} product={{ ...product, category: product.category ?? categories.find((item) => item.id === product.category_id) }} />)}</div> : <EmptyState title="Nenhum produto por aqui" text="Tente outra busca ou escolha uma categoria diferente." />}
    </section>
  </div>;
}
