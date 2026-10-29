import { ProductCatalog } from "../components/ProductCatalog";
import { usePageMeta } from "../hooks/usePageMeta";

export function Store() {
  usePageMeta("Livros e E-books", "Encontre livros, e-books e conteúdos digitais. Busque por título ou explore as categorias.");
  return <div className="products-page"><ProductCatalog headingLevel="h1" sector="book" /></div>;
}
