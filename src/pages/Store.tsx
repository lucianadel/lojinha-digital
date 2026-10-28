import { ProductCatalog } from "../components/ProductCatalog";
import { usePageMeta } from "../hooks/usePageMeta";

export function Store() {
  usePageMeta("Produtos", "Encontre livros, e-books e conteúdos digitais. Busque por título ou explore as categorias.");
  return <div className="products-page"><ProductCatalog headingLevel="h1" /></div>;
}
