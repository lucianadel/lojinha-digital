import { BookOpen, Shapes } from "lucide-react";
import { Link } from "react-router-dom";
import { ProductCatalog } from "../components/ProductCatalog";
import { KIDS_CATEGORIES } from "../lib/kids";
import { usePageMeta } from "../hooks/usePageMeta";
import "../kids.css";

export function Kids() {
  usePageMeta("Lojinha Digital Kids", "Aprender, Colorir e Descobrir: materiais pedagógicos digitais para imprimir, organizados em seis categorias.");
  return <>
    <header className="public-container kids-intro"><span className="store-kicker"><Shapes size={16} aria-hidden="true" /> LOJINHA DIGITAL KIDS</span><h1>Aprender, Colorir<br /><span>e Descobrir.</span></h1><p>Pequenas atividades, novas descobertas. Uma coleção de materiais pedagógicos para acompanhar momentos de aprendizado em casa e na sala de aula.</p><div className="kids-format"><BookOpen size={18} aria-hidden="true" /><span>Materiais em PDF para imprimir • Confira a indicação de cada kit.</span></div></header>
    <nav className="public-container kids-categories" aria-label="Categorias da coleção Kids">{KIDS_CATEGORIES.map((category, index) => <Link key={category.slug} to={`/kids?categoria=${category.slug}`} className={`kids-category kids-tone-${index}`}><span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>{category.name}</Link>)}</nav>
    <aside className="public-container kids-information"><Link className="store-button store-button-outline" to="/kids/previa">Conhecer a pr?via dos 63 kits</Link><p>Cat?logo demonstrativo: pre?os sugeridos e produtos ainda em revis?o, sem compra dispon?vel.</p></aside>
    <ProductCatalog collection="kids" />
    <aside className="public-container kids-information"><p>Escolha um kit e confira suas atividades, faixa etária indicada e condições de compra na página do produto. Nas compras pelo WhatsApp, o material é enviado manualmente após a confirmação do pagamento.</p><p>Conteúdo de acervo licenciado e não exclusivo, apresentado com a identidade Lojinha Digital Kids.</p><Link className="store-text-link" to="/loja">Ver também os outros livros e produtos da loja</Link></aside>
  </>;
}
