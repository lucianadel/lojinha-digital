import { BookOpen, Sparkles } from "lucide-react";
import { ProductCatalog } from "../components/ProductCatalog";
import { PersonalizedServices } from "../components/PersonalizedServices";
import { usePageMeta } from "../hooks/usePageMeta";

export function Home() {
  usePageMeta("Livros, conhecimento e histórias", "Livros, conhecimento e histórias feitas para você. Encontre nossos produtos e conheça as criações personalizadas.");
  return <>
    <section className="welcome public-container" aria-labelledby="welcome-title">
      <div><span className="store-kicker"><BookOpen size={15} aria-hidden="true" /> UM MUNDO PARA DESCOBRIR</span>
        <h1 id="welcome-title">Livros, conhecimento e histórias <span>feitas para você.</span></h1>
        <p>Encontre sua próxima leitura. Dê espaço a uma nova ideia.</p>
      </div>
      <span className="welcome-note"><Sparkles size={20} aria-hidden="true" /> Para aprender,<br />imaginar e criar.</span>
    </section>
    <ProductCatalog />
    <PersonalizedServices compact />
  </>;
}
