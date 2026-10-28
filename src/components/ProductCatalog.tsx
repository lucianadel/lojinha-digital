import { Search, SlidersHorizontal, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getCategories, getPublishedProducts, isDemoMode } from "../services/products";
import { descriptionToText } from "../lib/format";
import { isKidsProduct, kidsCategoryFor, KIDS_CATEGORIES } from "../lib/kids";
import { ProductCard } from "./ProductCard";
import { EmptyState, ErrorState, LoadingState } from "./StoreState";
import type { Category, Product } from "../types";

const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");

export function ProductCatalog({ headingLevel: Heading = "h2", collection }: { headingLevel?: "h1" | "h2"; collection?: "kids" | "general" }) {
  const [params, setParams] = useSearchParams();
  const query = params.get("q") ?? "";
  const category = params.get("categoria") ?? "";
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(!isDemoMode);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  const load = useCallback(async () => {
    if (isDemoMode) return;
    const id = ++requestId.current;
    setError("");
    try {
      const [items, groups] = await Promise.all([getPublishedProducts(), getCategories()]);
      if (id !== requestId.current) return;
      setProducts(items.filter((item) => item.status === "published" && (collection !== "kids" || isKidsProduct(item)))
        .sort((a, b) => Number(isKidsProduct(a)) - Number(isKidsProduct(b))));
      setCategories(collection === "kids" ? KIDS_CATEGORIES : groups);
    } catch {
      if (id === requestId.current) setError("Não foi possível carregar os produtos. Verifique sua conexão e tente novamente.");
    } finally { if (id === requestId.current) setLoading(false); }
  }, [collection]);

  useEffect(() => {
    void load();
    // Read-only refresh also picks up new publications without a frontend deploy.
    const refresh = () => { if (document.visibilityState === "visible") void load(); };
    const interval = window.setInterval(refresh, 60_000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      requestId.current++;
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [load]);

  function updateFilter(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next, { replace: true });
  }
  function clearFilters() {
    const next = new URLSearchParams(params);
    next.delete("q"); next.delete("categoria");
    setParams(next, { replace: true });
  }
  // Keep a large Kids release from burying the existing books on the home page.
  // Explicit searches and filters still search the complete published catalog.
  const available = useMemo(() => collection === "general" && !query.trim() && !category
    ? products.filter(product => !isKidsProduct(product)) : products, [products, collection, query, category]);
  const filtered = useMemo(() => available.filter((product) => {
    const group = collection === "kids" ? kidsCategoryFor(product) : product.category ?? categories.find((item) => item.id === product.category_id);
    const text = normalize(`${product.title} ${descriptionToText(product.short_description)} ${group?.name ?? ""}`);
    return text.includes(normalize(query.trim())) && (!category || category === group?.slug || category === product.category_id);
  }), [available, categories, query, category, collection]);

  return <section className="public-container product-catalog" id="produtos" aria-labelledby="catalog-title">
    <div className="catalog-heading"><div><span className="store-kicker">{collection === "kids" ? "ESCOLHA UMA NOVA DESCOBERTA" : "ENCONTRE SEU PRÓXIMO FAVORITO"}</span><Heading id="catalog-title">{collection === "kids" ? "Kits disponíveis" : "Explore nossos produtos"}<span className="heading-dot">.</span></Heading></div>
      {!loading && !error && !isDemoMode && <span className="catalog-total">{available.length} {available.length === 1 ? "produto disponível" : "produtos disponíveis"}</span>}
    </div>
    {!isDemoMode && <div className="catalog-controls" role="search" aria-label="Buscar no catálogo">
      <label className="catalog-search"><Search size={20} aria-hidden="true" /><span className="sr-only">Buscar produtos</span><input type="search" placeholder="Busque por título, assunto ou palavra-chave" value={query} onChange={(event) => updateFilter("q", event.target.value)} /></label>
      <label className="catalog-filter"><SlidersHorizontal size={18} aria-hidden="true" /><span className="sr-only">Filtrar por categoria</span><select value={category} onChange={(event) => updateFilter("categoria", event.target.value)}><option value="">Todas as categorias</option>{categories.map((item) => <option value={item.slug} key={item.id}>{item.name}</option>)}</select></label>
    </div>}
    {(query || category) && <div className="active-filters"><span role="status">{filtered.length} {filtered.length === 1 ? "produto encontrado" : "produtos encontrados"}</span><button type="button" onClick={clearFilters}><X size={15} aria-hidden="true" /> Limpar filtros</button></div>}
    {isDemoMode ? <EmptyState title="Catálogo temporariamente indisponível" text="Volte em breve para conhecer os produtos disponíveis." />
      : loading ? <LoadingState label="Carregando produtos..." />
      : error ? <ErrorState message={error} onRetry={() => { setLoading(true); void load(); }} />
      : filtered.length ? <div className="catalog-grid">{filtered.map((product) => <ProductCard key={product.id} product={{ ...product, category: collection === "kids" ? kidsCategoryFor(product) ?? undefined : product.category ?? categories.find((item) => item.id === product.category_id) }} />)}</div>
      : <EmptyState title={products.length ? "Nenhum produto encontrado" : collection === "kids" ? "A coleção está em preparação" : "Novas leituras estão a caminho"} text={products.length ? "Tente outra palavra ou limpe os filtros para ver todos os produtos." : "Assim que novos produtos forem publicados, você poderá encontrá-los aqui."} />}
  </section>;
}
