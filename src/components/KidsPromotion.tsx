import { ArrowRight, Shapes } from "lucide-react";
import { Link } from "react-router-dom";
import "../kids.css";

export function KidsPromotion() {
  return <section className="public-container kids-promotion" aria-labelledby="kids-promo-title">
    <span className="kids-mark" aria-hidden="true"><Shapes size={29} /></span>
    <div><span className="store-kicker">UMA COLEÇÃO PARA PEQUENAS DESCOBERTAS</span><h2 id="kids-promo-title">Lojinha Digital <span>Kids</span></h2><p>Aprender, Colorir e Descobrir. Materiais pedagógicos para pais, professores e responsáveis.</p></div>
    <Link className="store-button store-button-outline" to="/kids">Conheça a coleção <ArrowRight size={18} aria-hidden="true" /></Link>
  </section>;
}
