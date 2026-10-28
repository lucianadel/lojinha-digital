import { ArrowRight, BookOpenText, Music2, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { ContactAction } from "./ContactAction";

export function PersonalizedServices({ compact = false }: { compact?: boolean }) {
  const Heading = compact ? "h2" : "h1";
  const CardHeading = compact ? "h3" : "h2";
  return <section className={`personalized-section ${compact ? "is-compact" : ""}`} aria-labelledby="personalized-title"><div className="public-container">
    <div className="personalized-heading"><div><span className="store-kicker"><Sparkles size={15} aria-hidden="true" /> CRIAÇÕES COM A SUA ESSÊNCIA</span><Heading id="personalized-title">Feito especialmente <span>para você.</span></Heading><p>Ideias que ganham páginas. Histórias que ganham voz.</p></div>{compact && <Link className="store-text-link" to="/personalizados">Conheça os serviços <ArrowRight size={17} aria-hidden="true" /></Link>}</div>
    <div className="services-grid">
      <article className="service-card service-books"><div className="service-card-top"><span className="service-icon"><BookOpenText size={26} aria-hidden="true" /></span><span className="service-label">LIVROS & E-BOOKS</span><span aria-hidden="true" className="service-spark">✳</span></div><CardHeading>Sua ideia merece<br />virar um livro!</CardHeading><p>Transformamos suas ideias, conhecimentos e histórias em livros e e-books personalizados.</p><ContactAction label="Solicitar orçamento" subject="Quero solicitar um orçamento para criar um livro ou e-book" /></article>
      <article className="service-card service-music"><div className="service-card-top"><span className="service-icon"><Music2 size={26} aria-hidden="true" /></span><span className="service-label">VOZYX STUDIO — MÚSICAS PERSONALIZADAS</span><span aria-hidden="true" className="service-spark">♪</span></div><CardHeading>Sua história pode<br />virar música!</CardHeading><p>Transformamos histórias e sentimentos em músicas exclusivas para homenagens, aniversários e ocasiões especiais.</p><ContactAction label="Quero minha música" subject="Quero encomendar uma música personalizada com a Vozyx Studio" tone="pink" /></article>
    </div>
  </div></section>;
}
